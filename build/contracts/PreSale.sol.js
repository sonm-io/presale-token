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
      throw new Error("PreSale error: Please call setProvider() first before calling new().");
    }

    var args = Array.prototype.slice.call(arguments);

    if (!this.unlinked_binary) {
      throw new Error("PreSale error: contract binary not set. Can't deploy new instance.");
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

      throw new Error("PreSale contains unresolved libraries. You must deploy and link the following libraries before you can deploy a new version of PreSale: " + unlinked_libraries);
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
      throw new Error("Invalid address passed to PreSale.at(): " + address);
    }

    var contract_class = this.web3.eth.contract(this.abi);
    var contract = contract_class.at(address);

    return new this(contract);
  };

  Contract.deployed = function() {
    if (!this.address) {
      throw new Error("Cannot find deployed address: PreSale not deployed or address not set.");
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
        "inputs": [],
        "name": "name",
        "outputs": [
          {
            "name": "",
            "type": "string"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_spender",
            "type": "address"
          },
          {
            "name": "_value",
            "type": "uint256"
          }
        ],
        "name": "approve",
        "outputs": [
          {
            "name": "success",
            "type": "bool"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "totalSupply",
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
          },
          {
            "name": "_value",
            "type": "uint256"
          }
        ],
        "name": "transferFrom",
        "outputs": [
          {
            "name": "success",
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
            "name": "newOut",
            "type": "address"
          }
        ],
        "name": "changeWithDraw",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "decimals",
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
        "inputs": [],
        "name": "withdraw",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "presaleEtherRaised",
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
        "name": "manager",
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
        "inputs": [],
        "name": "emergencyStop",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "_owner",
            "type": "address"
          }
        ],
        "name": "balanceOf",
        "outputs": [
          {
            "name": "balance",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "etherCap",
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
        "name": "stopped",
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
        "name": "destroy",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [],
        "name": "release",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "owner",
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
        "constant": true,
        "inputs": [],
        "name": "symbol",
        "outputs": [
          {
            "name": "",
            "type": "string"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "getPrice",
        "outputs": [
          {
            "name": "result",
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
            "name": "_to",
            "type": "address"
          },
          {
            "name": "_value",
            "type": "uint256"
          }
        ],
        "name": "transfer",
        "outputs": [
          {
            "name": "success",
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
            "name": "newManager",
            "type": "address"
          }
        ],
        "name": "transferManager",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_prebuy",
            "type": "address"
          }
        ],
        "name": "DestroyMigr",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "presaleTokenSupply",
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
        "inputs": [
          {
            "name": "_owner",
            "type": "address"
          },
          {
            "name": "_spender",
            "type": "address"
          }
        ],
        "name": "allowance",
        "outputs": [
          {
            "name": "remaining",
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
            "name": "newOwner",
            "type": "address"
          }
        ],
        "name": "transferOwnership",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "recipient",
            "type": "address"
          }
        ],
        "name": "BuyToken",
        "outputs": [],
        "payable": true,
        "type": "function"
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
            "name": "_prebuy",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "Migrated",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "sender",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "eth",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "pst",
            "type": "uint256"
          }
        ],
        "name": "Buy",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "from",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "to",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "value",
            "type": "uint256"
          }
        ],
        "name": "Transfer",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "owner",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "spender",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "value",
            "type": "uint256"
          }
        ],
        "name": "Approval",
        "type": "event"
      }
    ],
    "unlinked_binary": "0x60a0604052600c60608190527f50726573616c65546f6b656e000000000000000000000000000000000000000060809081526004805460008290527f50726573616c65546f6b656e0000000000000000000000000000000000000018825590927f8a35acfbc15ff81a39ae7d344fd709f28e8600b4aa8c65c6b64bfe7fe36bd19b602060026001851615610100026000190190941693909304601f01929092048201929091906100d7565b828001600101855582156100d7579182015b828111156100d75782518255916020019190600101906100bc565b5b506100f89291505b808211156100f457600081556001016100e0565b5090565b50506040805180820190915260038082527f505354000000000000000000000000000000000000000000000000000000000060209283019081526005805460008290528251600660ff1990911617825590937f036b6384b5eca791c62761152d0c79bb0604c104a5fb6f4eb0703f3154bb3db060026001841615610100026000190190931692909204601f0104810192916101bb565b828001600101855582156101bb579182015b828111156101bb5782518255916020019190600101906101a0565b5b506101dc9291505b808211156100f457600081556001016100e0565b5090565b5050601260065560035460078054600160a060020a03909216600160a060020a03199283168117909155600880549092161790556103e860095569043c33c1937564800000600a556000600b819055600c555b60038054600160a060020a03191633600160a060020a03161790555b5b610d348061025b6000396000f3006060604052361561012d5763ffffffff60e060020a60003504166306fdde03811461013f578063095ea7b3146101cc57806318160ddd146101fc57806323b872dd1461021b57806326201a1914610251578063313ce5671461026c5780633ccfd60b1461028b57806344b499581461029a578063481c6a75146102b957806363a599a4146102e257806370a08231146102f15780637228b9db1461031c57806375f12b211461033b57806383197ef01461035c57806386d1a69f1461036b5780638da5cb5b1461037a57806395d89b41146103a357806398d5fdca14610430578063a9059cbb1461044f578063ba0e930a1461047f578063c3c7d45c1461049a578063c4fc3a3b146104b5578063dd62ed3e146104d4578063f2fde38b14610505578063fe03068d14610520575b61013d5b61013a33610536565b5b565b005b346100005761014c610637565b604080516020808252835181830152835191928392908301918501908083838215610192575b80518252602083111561019257601f199092019160209182019101610172565b505050905090810190601f1680156101be5780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b34610000576101e8600160a060020a03600435166024356106c5565b604080519115158252519081900360200190f35b3461000057610209610730565b60408051918252519081900360200190f35b34610000576101e8600160a060020a0360043581169060243516604435610736565b604080519115158252519081900360200190f35b346100005761013d600160a060020a0360043516610839565b005b346100005761020961088a565b60408051918252519081900360200190f35b346100005761013d610890565b005b34610000576102096108c9565b60408051918252519081900360200190f35b34610000576102c66108cf565b60408051600160a060020a039092168252519081900360200190f35b346100005761013d6108de565b005b3461000057610209600160a060020a0360043516610927565b60408051918252519081900360200190f35b3461000057610209610946565b60408051918252519081900360200190f35b34610000576101e861094c565b604080519115158252519081900360200190f35b346100005761013d61095c565b005b346100005761013d610982565b005b34610000576102c66109d9565b60408051600160a060020a039092168252519081900360200190f35b346100005761014c6109e8565b604080516020808252835181830152835191928392908301918501908083838215610192575b80518252602083111561019257601f199092019160209182019101610172565b505050905090810190601f1680156101be5780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b3461000057610209610a76565b60408051918252519081900360200190f35b34610000576101e8600160a060020a0360043516602435610a7d565b604080519115158252519081900360200190f35b346100005761013d600160a060020a0360043516610b31565b005b346100005761013d600160a060020a0360043516610b82565b005b3461000057610209610c07565b60408051918252519081900360200190f35b3461000057610209600160a060020a0360043581169060243516610c0d565b60408051918252519081900360200190f35b346100005761013d600160a060020a0360043516610c3a565b005b61013d600160a060020a0360043516610536565b005b600034151561054457610000565b600a54610553600c5434610c8b565b1180610568575060035460a060020a900460ff165b1561057257610000565b6105833461057e610a76565b610cb3565b905061059160005482610c8b565b6000908155600160a060020a0383168152600160205260409020546105b69082610c8b565b600160a060020a038316600090815260016020526040902055600b546105dc9082610c8b565b600b55600c546105ec9034610c8b565b600c5560408051348152602081018390528151600160a060020a038516927f1cbc5ab135991bd2b6a4b034a04aa2aa086dac1371cb9b16b8b5e2ed6b036bed928290030190a25b5050565b6004805460408051602060026001851615610100026000190190941693909304601f810184900484028201840190925281815292918301828280156106bd5780601f10610692576101008083540402835291602001916106bd565b820191906000526020600020905b8154815290600101906020018083116106a057829003601f168201915b505050505081565b600160a060020a03338116600081815260026020908152604080832094871680845294825280832086905580518681529051929493927f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925929181900390910190a35060015b92915050565b60005481565b600160a060020a0380841660009081526002602090815260408083203385168452825280832054938616835260019091528120549091906107779084610c8b565b600160a060020a0380861660009081526001602052604080822093909355908716815220546107a69084610cdf565b600160a060020a0386166000908152600160205260409020556107c98184610cdf565b600160a060020a038087166000818152600260209081526040808320338616845282529182902094909455805187815290519288169391927fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef929181900390910190a3600191505b509392505050565b60075433600160a060020a039081169116141561088157600160a060020a0381161561087b5760078054600160a060020a031916600160a060020a0383161790555b5b610886565b610000565b5b50565b60065481565b600754600c54604051600160a060020a039092169181156108fc0291906000818181858888f19350505050151561013a57610000565b5b565b600c5481565b600854600160a060020a031681565b60035433600160a060020a0390811691161415610881576003805474ff0000000000000000000000000000000000000000191660a060020a1790555b61013a565b610000565b5b565b600160a060020a0381166000908152600160205260409020545b919050565b600a5481565b60035460a060020a900460ff1681565b60035433600160a060020a039081169116141561013a5733600160a060020a0316ff5b5b565b60035433600160a060020a03908116911614156108815760035460a060020a900460ff161561091a576003805474ff0000000000000000000000000000000000000000191690555b5b5b61013a565b610000565b5b565b600354600160a060020a031681565b6005805460408051602060026001851615610100026000190190941693909304601f810184900484028201840190925281815292918301828280156106bd5780601f10610692576101008083540402835291602001916106bd565b820191906000526020600020905b8154815290600101906020018083116106a057829003601f168201915b505050505081565b6009545b90565b600160a060020a033316600090815260016020526040812054610aa09083610cdf565b600160a060020a033381166000908152600160205260408082209390935590851681522054610acf9083610c8b565b600160a060020a038085166000818152600160209081526040918290209490945580518681529051919333909316927fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef92918290030190a35060015b92915050565b60085433600160a060020a039081169116141561088157600160a060020a0381161561087b5760088054600160a060020a031916600160a060020a0383161790555b5b610886565b610000565b5b50565b60085460009033600160a060020a03908116911614156108815750600160a060020a038116600081815260016020908152604080832080549390558051938452908301829052805191927f8b80bd19aea7b735bc6d75db8d6adbe18b28c30d62b3555245eb67b2340caedc929081900390910190a15b610633565b610000565b5b5050565b600b5481565b600160a060020a038083166000908152600260209081526040808320938516835292905220545b92915050565b60035433600160a060020a039081169116141561088157600160a060020a0381161561087b5760038054600160a060020a031916600160a060020a0383161790555b5b610886565b610000565b5b50565b6000828201610ca8848210801590610ca35750838210155b610cf8565b8091505b5092915050565b6000828202610ca8841580610ca3575083858381156100005704145b610cf8565b8091505b5092915050565b6000610ced83831115610cf8565b508082035b92915050565b80151561088657610000565b5b505600a165627a7a7230582078461ada35eb09636d81f4ee5e7c6859b95e92013e6a612b8252f642e1cffa620029",
    "events": {
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "from",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "to",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "value",
            "type": "uint256"
          }
        ],
        "name": "Transfer",
        "type": "event"
      },
      "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "owner",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "spender",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "value",
            "type": "uint256"
          }
        ],
        "name": "Approval",
        "type": "event"
      },
      "0x8b80bd19aea7b735bc6d75db8d6adbe18b28c30d62b3555245eb67b2340caedc": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "_prebuy",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "Migrated",
        "type": "event"
      },
      "0x1cbc5ab135991bd2b6a4b034a04aa2aa086dac1371cb9b16b8b5e2ed6b036bed": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "sender",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "eth",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "pst",
            "type": "uint256"
          }
        ],
        "name": "Buy",
        "type": "event"
      }
    },
    "updated_at": 1486045583924,
    "links": {},
    "address": "0x11e5c2b0f5e0739fd981c83bd30fa18d5173f978"
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

  Contract.contract_name   = Contract.prototype.contract_name   = "PreSale";
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
    window.PreSale = Contract;
  }
})();
