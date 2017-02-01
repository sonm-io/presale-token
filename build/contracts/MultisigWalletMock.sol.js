var Web3 = require("web3");
var SolidityEvent = require("web3/lib/web3/event.js");

(function() {
  // Planned for future features, logging, etc.
  function Provider(provider) {
    this.provider = provider;
  }

  Provider.prototype.send = function() {
    this.provider.send.apply(this.provider, arguments);
  };

  Provider.prototype.sendAsync = function() {
    this.provider.sendAsync.apply(this.provider, arguments);
  };

  var BigNumber = (new Web3()).toBigNumber(0).constructor;

  var Utils = {
    is_object: function(val) {
      return typeof val == "object" && !Array.isArray(val);
    },
    is_big_number: function(val) {
      if (typeof val != "object") return false;

      // Instanceof won't work because we have multiple versions of Web3.
      try {
        new BigNumber(val);
        return true;
      } catch (e) {
        return false;
      }
    },
    merge: function() {
      var merged = {};
      var args = Array.prototype.slice.call(arguments);

      for (var i = 0; i < args.length; i++) {
        var object = args[i];
        var keys = Object.keys(object);
        for (var j = 0; j < keys.length; j++) {
          var key = keys[j];
          var value = object[key];
          merged[key] = value;
        }
      }

      return merged;
    },
    promisifyFunction: function(fn, C) {
      var self = this;
      return function() {
        var instance = this;

        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return new Promise(function(accept, reject) {
          var callback = function(error, result) {
            if (error != null) {
              reject(error);
            } else {
              accept(result);
            }
          };
          args.push(tx_params, callback);
          fn.apply(instance.contract, args);
        });
      };
    },
    synchronizeFunction: function(fn, instance, C) {
      var self = this;
      return function() {
        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return new Promise(function(accept, reject) {

          var decodeLogs = function(logs) {
            return logs.map(function(log) {
              var logABI = C.events[log.topics[0]];

              if (logABI == null) {
                return null;
              }

              var decoder = new SolidityEvent(null, logABI, instance.address);
              return decoder.decode(log);
            }).filter(function(log) {
              return log != null;
            });
          };

          var callback = function(error, tx) {
            if (error != null) {
              reject(error);
              return;
            }

            var timeout = C.synchronization_timeout || 240000;
            var start = new Date().getTime();

            var make_attempt = function() {
              C.web3.eth.getTransactionReceipt(tx, function(err, receipt) {
                if (err) return reject(err);

                if (receipt != null) {
                  // If they've opted into next gen, return more information.
                  if (C.next_gen == true) {
                    return accept({
                      tx: tx,
                      receipt: receipt,
                      logs: decodeLogs(receipt.logs)
                    });
                  } else {
                    return accept(tx);
                  }
                }

                if (timeout > 0 && new Date().getTime() - start > timeout) {
                  return reject(new Error("Transaction " + tx + " wasn't processed in " + (timeout / 1000) + " seconds!"));
                }

                setTimeout(make_attempt, 1000);
              });
            };

            make_attempt();
          };

          args.push(tx_params, callback);
          fn.apply(self, args);
        });
      };
    }
  };

  function instantiate(instance, contract) {
    instance.contract = contract;
    var constructor = instance.constructor;

    // Provision our functions.
    for (var i = 0; i < instance.abi.length; i++) {
      var item = instance.abi[i];
      if (item.type == "function") {
        if (item.constant == true) {
          instance[item.name] = Utils.promisifyFunction(contract[item.name], constructor);
        } else {
          instance[item.name] = Utils.synchronizeFunction(contract[item.name], instance, constructor);
        }

        instance[item.name].call = Utils.promisifyFunction(contract[item.name].call, constructor);
        instance[item.name].sendTransaction = Utils.promisifyFunction(contract[item.name].sendTransaction, constructor);
        instance[item.name].request = contract[item.name].request;
        instance[item.name].estimateGas = Utils.promisifyFunction(contract[item.name].estimateGas, constructor);
      }

      if (item.type == "event") {
        instance[item.name] = contract[item.name];
      }
    }

    instance.allEvents = contract.allEvents;
    instance.address = contract.address;
    instance.transactionHash = contract.transactionHash;
  };

  // Use inheritance to create a clone of this contract,
  // and copy over contract's static functions.
  function mutate(fn) {
    var temp = function Clone() { return fn.apply(this, arguments); };

    Object.keys(fn).forEach(function(key) {
      temp[key] = fn[key];
    });

    temp.prototype = Object.create(fn.prototype);
    bootstrap(temp);
    return temp;
  };

  function bootstrap(fn) {
    fn.web3 = new Web3();
    fn.class_defaults  = fn.prototype.defaults || {};

    // Set the network iniitally to make default data available and re-use code.
    // Then remove the saved network id so the network will be auto-detected on first use.
    fn.setNetwork("default");
    fn.network_id = null;
    return fn;
  };

  // Accepts a contract object created with web3.eth.contract.
  // Optionally, if called without `new`, accepts a network_id and will
  // create a new version of the contract abstraction with that network_id set.
  function Contract() {
    if (this instanceof Contract) {
      instantiate(this, arguments[0]);
    } else {
      var C = mutate(Contract);
      var network_id = arguments.length > 0 ? arguments[0] : "default";
      C.setNetwork(network_id);
      return C;
    }
  };

  Contract.currentProvider = null;

  Contract.setProvider = function(provider) {
    var wrapped = new Provider(provider);
    this.web3.setProvider(wrapped);
    this.currentProvider = provider;
  };

  Contract.new = function() {
    if (this.currentProvider == null) {
      throw new Error("MultisigWalletMock error: Please call setProvider() first before calling new().");
    }

    var args = Array.prototype.slice.call(arguments);

    if (!this.unlinked_binary) {
      throw new Error("MultisigWalletMock error: contract binary not set. Can't deploy new instance.");
    }

    var regex = /__[^_]+_+/g;
    var unlinked_libraries = this.binary.match(regex);

    if (unlinked_libraries != null) {
      unlinked_libraries = unlinked_libraries.map(function(name) {
        // Remove underscores
        return name.replace(/_/g, "");
      }).sort().filter(function(name, index, arr) {
        // Remove duplicates
        if (index + 1 >= arr.length) {
          return true;
        }

        return name != arr[index + 1];
      }).join(", ");

      throw new Error("MultisigWalletMock contains unresolved libraries. You must deploy and link the following libraries before you can deploy a new version of MultisigWalletMock: " + unlinked_libraries);
    }

    var self = this;

    return new Promise(function(accept, reject) {
      var contract_class = self.web3.eth.contract(self.abi);
      var tx_params = {};
      var last_arg = args[args.length - 1];

      // It's only tx_params if it's an object and not a BigNumber.
      if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
        tx_params = args.pop();
      }

      tx_params = Utils.merge(self.class_defaults, tx_params);

      if (tx_params.data == null) {
        tx_params.data = self.binary;
      }

      // web3 0.9.0 and above calls new twice this callback twice.
      // Why, I have no idea...
      var intermediary = function(err, web3_instance) {
        if (err != null) {
          reject(err);
          return;
        }

        if (err == null && web3_instance != null && web3_instance.address != null) {
          accept(new self(web3_instance));
        }
      };

      args.push(tx_params, intermediary);
      contract_class.new.apply(contract_class, args);
    });
  };

  Contract.at = function(address) {
    if (address == null || typeof address != "string" || address.length != 42) {
      throw new Error("Invalid address passed to MultisigWalletMock.at(): " + address);
    }

    var contract_class = this.web3.eth.contract(this.abi);
    var contract = contract_class.at(address);

    return new this(contract);
  };

  Contract.deployed = function() {
    if (!this.address) {
      throw new Error("Cannot find deployed address: MultisigWalletMock not deployed or address not set.");
    }

    return this.at(this.address);
  };

  Contract.defaults = function(class_defaults) {
    if (this.class_defaults == null) {
      this.class_defaults = {};
    }

    if (class_defaults == null) {
      class_defaults = {};
    }

    var self = this;
    Object.keys(class_defaults).forEach(function(key) {
      var value = class_defaults[key];
      self.class_defaults[key] = value;
    });

    return this.class_defaults;
  };

  Contract.extend = function() {
    var args = Array.prototype.slice.call(arguments);

    for (var i = 0; i < arguments.length; i++) {
      var object = arguments[i];
      var keys = Object.keys(object);
      for (var j = 0; j < keys.length; j++) {
        var key = keys[j];
        var value = object[key];
        this.prototype[key] = value;
      }
    }
  };

  Contract.all_networks = {
  "default": {
    "abi": [
      {
        "constant": true,
        "inputs": [
          {
            "name": "_addr",
            "type": "address"
          }
        ],
        "name": "isOwner",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [],
        "name": "resetSpentToday",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "dailyLimit",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "totalSpending",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "lastDay",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_h",
            "type": "bytes32"
          }
        ],
        "name": "confirm",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_newLimit",
            "type": "uint256"
          }
        ],
        "name": "setDailyLimit",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_to",
            "type": "address"
          },
          {
            "name": "_value",
            "type": "uint256"
          },
          {
            "name": "_data",
            "type": "bytes"
          }
        ],
        "name": "execute",
        "outputs": [
          {
            "name": "_r",
            "type": "bytes32"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_operation",
            "type": "bytes32"
          }
        ],
        "name": "revoke",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "_operation",
            "type": "bytes32"
          },
          {
            "name": "_owner",
            "type": "address"
          }
        ],
        "name": "hasConfirmed",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "ownerIndex",
            "type": "uint256"
          }
        ],
        "name": "getOwner",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_to",
            "type": "address"
          }
        ],
        "name": "kill",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "required",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_from",
            "type": "address"
          },
          {
            "name": "_to",
            "type": "address"
          }
        ],
        "name": "changeOwner",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "spentToday",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "inputs": [
          {
            "name": "_owners",
            "type": "address[]"
          },
          {
            "name": "_required",
            "type": "uint256"
          },
          {
            "name": "_daylimit",
            "type": "uint256"
          }
        ],
        "payable": true,
        "type": "constructor"
      },
      {
        "payable": true,
        "type": "fallback"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "owner",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "operation",
            "type": "bytes32"
          }
        ],
        "name": "Confirmation",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "owner",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "operation",
            "type": "bytes32"
          }
        ],
        "name": "Revoke",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "_from",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "value",
            "type": "uint256"
          }
        ],
        "name": "Deposit",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "owner",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "value",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "to",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "data",
            "type": "bytes"
          }
        ],
        "name": "SingleTransact",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "owner",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "operation",
            "type": "bytes32"
          },
          {
            "indexed": false,
            "name": "value",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "to",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "data",
            "type": "bytes"
          }
        ],
        "name": "MultiTransact",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "operation",
            "type": "bytes32"
          },
          {
            "indexed": false,
            "name": "initiator",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "value",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "to",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "data",
            "type": "bytes"
          }
        ],
        "name": "ConfirmationNeeded",
        "type": "event"
      }
    ],
    "unlinked_binary": "0x6060604052604051610dd9380380610dd983398101604090815281516020830151918301519201915b8282825b805b83835b600033600160a060020a03166002825b505550600160a060020a033316600090815261010160205260408120600190555b82518110156100e457828181518110156100005790602001906020020151600160a060020a0316600182600201610100811015610000570160005b5081905550806002016101016000858481518110156100005790602001906020020151600160a060020a03168152602001908152602001600020819055505b600101610062565b60008290555b505050610104819055610108640100000000610c6f61011b82021704565b610106555b505b5050505b505050610125565b6201518042045b90565b610ca5806101346000396000f300606060405236156100bf5763ffffffff60e060020a6000350416632f54bf6e81146101155780635c52c2f51461014257806367eeba0c146101515780636997bcab146101705780636b0c932d1461018f578063797af627146101ae578063b20d30a9146101d2578063b61d27f6146101e4578063b75c7dc61461021f578063c2cf732614610231578063c41a360a14610261578063cbf0b0c01461028d578063dc8452cd146102a8578063f00d4b5d146102c7578063f059cf2b146102e8575b6101135b60003411156101105760408051600160a060020a033316815234602082015281517fe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c929181900390910190a15b5b565b005b346100005761012e600160a060020a0360043516610307565b604080519115158252519081900360200190f35b3461000057610113610328565b005b346100005761015e610362565b60408051918252519081900360200190f35b346100005761015e610369565b60408051918252519081900360200190f35b346100005761015e610370565b60408051918252519081900360200190f35b346100005761012e600435610377565b604080519115158252519081900360200190f35b34610000576101136004356105f7565b005b346100005761015e60048035600160a060020a0316906024803591604435918201910135610633565b60408051918252519081900360200190f35b34610000576101136004356108ee565b005b346100005761012e600435600160a060020a0360243516610999565b604080519115158252519081900360200190f35b34610000576102716004356109ee565b60408051600160a060020a039092168252519081900360200190f35b3461000057610113600160a060020a0360043516610a0e565b005b346100005761015e610a4c565b60408051918252519081900360200190f35b3461000057610113600160a060020a036004358116906024351661062c565b005b346100005761015e610a57565b60408051918252519081900360200190f35b600160a060020a03811660009081526101016020526040812054115b919050565b60003660405180838380828437820191505092505050604051809103902061034f81610a5e565b1561035c5761035c610bf9565b5b5b5b50565b6101045481565b6101085481565b6101065481565b60008161038381610a5e565b156105ee5760008381526101076020526040902054600160a060020a0316156105ee5760008381526101076020526040908190208054600180830154935160029384018054600160a060020a0390941695949093919283928592918116156101000260001901160480156104385780601f1061040d57610100808354040283529160200191610438565b820191906000526020600020905b81548152906001019060200180831161041b57829003601f168201915b505091505060006040518083038185876185025a03f192505050151561045d57610000565b6000838152610107602090815260409182902060018082015482548551600160a060020a033381811683529682018b905296810183905295166060860181905260a06080870181815260029586018054958616156101000260001901909516959095049087018190527fe7c957c06e9a662c1a6c77366179f5b702b97651dc28eee7d5bf1dff6e40bb4a968a9593949293909160c0830190849080156105445780601f1061051957610100808354040283529160200191610544565b820191906000526020600020905b81548152906001019060200180831161052757829003601f168201915b5050965050505050505060405180910390a1600083815261010760205260408120805473ffffffffffffffffffffffffffffffffffffffff19168155600180820183905560028083018054858255939493909281161561010002600019011604601f8190106105b357506105e5565b601f0160209004906000526020600020908101906105e591905b808211156105e157600081556001016105cd565b5090565b5b505050600191505b5b5b5b50919050565b60003660405180838380828437820191505092505050604051809103902061061e81610a5e565b1561062c5761062c82610c02565b5b5b5b5050565b600061063e33610307565b156108e05761064c84610c0c565b15610725577f92ca3a80853e6663fa31fa10b99225f18d4902939b4c53a9caae9043f6efd00433858786866040518086600160a060020a0316600160a060020a0316815260200185815260200184600160a060020a0316600160a060020a0316815260200180602001828103825284848281815260200192508082843760405192018290039850909650505050505050a184600160a060020a03168484846040518083838082843782019150509250505060006040518083038185876185025a03f192505050151561071d57610000565b5060006108da565b6000364360405180848480828437820191505082815260200193505050506040518091039020905061075681610377565b158015610779575060008181526101076020526040902054600160a060020a0316155b156108da5760008181526101076020908152604082208054600160a060020a03891673ffffffffffffffffffffffffffffffffffffffff19909116178155600180820188905560029182018054818652948490209094601f928116156101000260001901169290920481019290920481019185919087908390106108085782800160ff19823516178555610835565b82800160010185558215610835579182015b8281111561083557823582559160200191906001019061081a565b5b506108569291505b808211156105e157600081556001016105cd565b5090565b505060408051828152600160a060020a033381811660208401529282018790528716606082015260a0608082018181529082018590527f1733cbb53659d713b79580f79f3f9ff215f78a7c7aa45890f3b89fc5cddfbf32928492909188918a918991899160c082018484808284376040519201829003995090975050505050505050a15b5b6108e5565b610000565b5b949350505050565b600160a060020a03331660009081526101016020526040812054908082151561091657610992565b50506000828152610102602052604081206001810154600284900a9290831611156109925780546001908101825581018054839003905560408051600160a060020a03331681526020810186905281517fc7fb647e59b18047309aa15aad418e5d7ca96d173ad704f1031a2c3d7591734b929181900390910190a15b5b50505050565b600082815261010260209081526040808320600160a060020a0385168452610101909252822054828115156109d157600093506109e5565b8160020a9050808360010154166000141593505b50505092915050565b6000600182600101610100811015610000570160005b505490505b919050565b600036604051808383808284378201915050925050506040518091039020610a3581610a5e565b1561062c5781600160a060020a0316ff5b5b5b5050565b60005481565b5b5050565b6101055481565b600160a060020a033316600090815261010160205260408120548180821515610a8657610bef565b60008581526101026020526040902080549092501515610b1a576000805483556001808401919091556101038054918201808255828015829011610aef57600083815260209020610aef9181019083015b808211156105e157600081556001016105cd565b5090565b5b50505060028301819055610103805487929081101561000057906000526020600020900160005b50555b8260020a90508082600101541660001415610bef5760408051600160a060020a03331681526020810187905281517fe1c52dc63b719ade82e8bea94cc41a0d5d28e4aaf536adb5e9cccc9ff8c1aeda929181900390910190a1815460019011610bdc5760008581526101026020526040902060020154610103805490919081101561000057906000526020600020900160005b506000908190558581526101026020526040812081815560018082018390556002909101919091559350610bef565b8154600019018255600182018054821790555b5b5b505050919050565b6000610105555b565b6101048190555b50565b600061010654610c1a610c6f565b1115610c3357600061010555610c2e610c6f565b610106555b6101055482810110801590610c5057506101045482610105540111155b15610c6657506101058054820190556001610323565b5060005b919050565b6201518042045b905600a165627a7a723058202d74129eed6594818c9dfb16f9dd44c28b36a304ad36ee297dea76266c7dca300029",
    "events": {
      "0xe1c52dc63b719ade82e8bea94cc41a0d5d28e4aaf536adb5e9cccc9ff8c1aeda": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "owner",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "operation",
            "type": "bytes32"
          }
        ],
        "name": "Confirmation",
        "type": "event"
      },
      "0xc7fb647e59b18047309aa15aad418e5d7ca96d173ad704f1031a2c3d7591734b": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "owner",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "operation",
            "type": "bytes32"
          }
        ],
        "name": "Revoke",
        "type": "event"
      },
      "0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "_from",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "value",
            "type": "uint256"
          }
        ],
        "name": "Deposit",
        "type": "event"
      },
      "0x92ca3a80853e6663fa31fa10b99225f18d4902939b4c53a9caae9043f6efd004": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "owner",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "value",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "to",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "data",
            "type": "bytes"
          }
        ],
        "name": "SingleTransact",
        "type": "event"
      },
      "0xe7c957c06e9a662c1a6c77366179f5b702b97651dc28eee7d5bf1dff6e40bb4a": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "owner",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "operation",
            "type": "bytes32"
          },
          {
            "indexed": false,
            "name": "value",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "to",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "data",
            "type": "bytes"
          }
        ],
        "name": "MultiTransact",
        "type": "event"
      },
      "0x1733cbb53659d713b79580f79f3f9ff215f78a7c7aa45890f3b89fc5cddfbf32": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "operation",
            "type": "bytes32"
          },
          {
            "indexed": false,
            "name": "initiator",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "value",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "to",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "data",
            "type": "bytes"
          }
        ],
        "name": "ConfirmationNeeded",
        "type": "event"
      }
    },
    "updated_at": 1485977996583,
    "links": {}
  }
};

  Contract.checkNetwork = function(callback) {
    var self = this;

    if (this.network_id != null) {
      return callback();
    }

    this.web3.version.network(function(err, result) {
      if (err) return callback(err);

      var network_id = result.toString();

      // If we have the main network,
      if (network_id == "1") {
        var possible_ids = ["1", "live", "default"];

        for (var i = 0; i < possible_ids.length; i++) {
          var id = possible_ids[i];
          if (Contract.all_networks[id] != null) {
            network_id = id;
            break;
          }
        }
      }

      if (self.all_networks[network_id] == null) {
        return callback(new Error(self.name + " error: Can't find artifacts for network id '" + network_id + "'"));
      }

      self.setNetwork(network_id);
      callback();
    })
  };

  Contract.setNetwork = function(network_id) {
    var network = this.all_networks[network_id] || {};

    this.abi             = this.prototype.abi             = network.abi;
    this.unlinked_binary = this.prototype.unlinked_binary = network.unlinked_binary;
    this.address         = this.prototype.address         = network.address;
    this.updated_at      = this.prototype.updated_at      = network.updated_at;
    this.links           = this.prototype.links           = network.links || {};
    this.events          = this.prototype.events          = network.events || {};

    this.network_id = network_id;
  };

  Contract.networks = function() {
    return Object.keys(this.all_networks);
  };

  Contract.link = function(name, address) {
    if (typeof name == "function") {
      var contract = name;

      if (contract.address == null) {
        throw new Error("Cannot link contract without an address.");
      }

      Contract.link(contract.contract_name, contract.address);

      // Merge events so this contract knows about library's events
      Object.keys(contract.events).forEach(function(topic) {
        Contract.events[topic] = contract.events[topic];
      });

      return;
    }

    if (typeof name == "object") {
      var obj = name;
      Object.keys(obj).forEach(function(name) {
        var a = obj[name];
        Contract.link(name, a);
      });
      return;
    }

    Contract.links[name] = address;
  };

  Contract.contract_name   = Contract.prototype.contract_name   = "MultisigWalletMock";
  Contract.generated_with  = Contract.prototype.generated_with  = "3.2.0";

  // Allow people to opt-in to breaking changes now.
  Contract.next_gen = false;

  var properties = {
    binary: function() {
      var binary = Contract.unlinked_binary;

      Object.keys(Contract.links).forEach(function(library_name) {
        var library_address = Contract.links[library_name];
        var regex = new RegExp("__" + library_name + "_*", "g");

        binary = binary.replace(regex, library_address.replace("0x", ""));
      });

      return binary;
    }
  };

  Object.keys(properties).forEach(function(key) {
    var getter = properties[key];

    var definition = {};
    definition.enumerable = true;
    definition.configurable = false;
    definition.get = getter;

    Object.defineProperty(Contract, key, definition);
    Object.defineProperty(Contract.prototype, key, definition);
  });

  bootstrap(Contract);

  if (typeof module != "undefined" && typeof module.exports != "undefined") {
    module.exports = Contract;
  } else {
    // There will only be one version of this contract in the browser,
    // and we can use that.
    window.MultisigWalletMock = Contract;
  }
})();
