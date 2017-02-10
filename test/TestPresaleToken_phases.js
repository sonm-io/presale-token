const PresaleToken = artifacts.require("./PresaleToken.sol");

const Phase = {
  Created:   0,
  Running:   1,
  Paused:    2,
  Migrating: 3,
  Migrated:  4
};

const PhaseStr = {};
Object.keys(Phase).forEach(k => PhaseStr[Phase[k]] = k);


contract("PresaleToken", () => {
  const
    [ tokenManager
    , crowdsaleManager
    , investor
    , creator
    ] = web3.eth.accounts;
  let token = null;

  // Check all variants of phase transition
  const ok = (from, to) =>
    it(`can move from ${PhaseStr[from]} to ${PhaseStr[to]}`, () =>
      token.setPresalePhase(to).then(() =>
        token.currentPhase.call().then(res =>
          assert.equal(to, res.toFixed(), `not Phase.${PhaseStr[to]}`))));

  const no = (from, to) =>
    it(`can't move from ${PhaseStr[from]} to ${PhaseStr[to]}`, () =>
      token.setPresalePhase(to)
        .then(assert.fail)
        .catch(() =>
          token.currentPhase.call().then(res =>
            assert.equal(from, res.toFixed(), `not Phase.${PhaseStr[from]}`))));

  it("can succesfully create PresaleToken", () =>
    PresaleToken.new(tokenManager, {from: creator})
      .then(res => {token = res}));

  it("should start with phase Created", () =>
    token.currentPhase.call().then(res =>
      assert.equal(0, res.toFixed(), "not Phase.Created")));


  // - buy
  // - burn
  // + withdraw
  // + set crowdsale manager
  // - selfdestruct
  it("should fail to call buyTokens in Phase.Created", () =>
    token.buyTokens({value: web3.toWei(1, 'ether'), from: investor})
      .then(assert.fail).catch(() => {}))

  it("should fail to call burnTokens in Phase.Created", () =>
    token.burnTokens(investor, {from: crowdsaleManager})
      .then(assert.fail).catch(() => {}))

  it("tokenManager can call withdrawEther in Phase.Created", () =>
    token.withdrawEther({from: tokenManager})
      .then(() => {}))

  it("tokenManager can call setCrowdsaleManager in Phase.Created", () =>
    token.setCrowdsaleManager(crowdsaleManager, {from: tokenManager})
      .then(() => token.crowdsaleManager.call().then(res =>
        assert.equal(crowdsaleManager, res, "Invalid crowdsaleManager"))))

  it("random guy should fail to call setCrowdsaleManager in Phase.Created", () =>
    token.setCrowdsaleManager(crowdsaleManager, {from: investor})
      .then(assert.fail).catch(() => {}))

  it("should fail to call selfdestruct in Phase.Created", () =>
    token.selfdestruct({from: tokenManager})
      .then(assert.fail).catch(() => {}))



  no(Phase.Created, Phase.Created);
  no(Phase.Created, Phase.Paused);
  no(Phase.Created, Phase.Migrating);
  no(Phase.Created, Phase.Migrated);
  ok(Phase.Created, Phase.Running);
  return;

  // + buy
  // - burn
  // + withdraw
  // + set crowdsale manager
  // - selfdestruct

  no(Phase.Running, Phase.Created);
  no(Phase.Running, Phase.Running);
  no(Phase.Running, Phase.Migrated);
  ok(Phase.Running, Phase.Paused);

  // - buy
  // - burn
  // + withdraw
  // + set crowdsale manager
  // - selfdestruct

  no(Phase.Paused, Phase.Created);
  no(Phase.Paused, Phase.Paused);
  no(Phase.Paused, Phase.Migrated);
  ok(Phase.Paused, Phase.Running);

  // check if crowdsale manager is set
  no(Phase.Running, Phase.Migrating);
  // set
  ok(Phase.Running, Phase.Migrating);

  // - buy
  // + burn
  // + withdraw
  // - set crowdsale manager
  // - selfdestruct

  no(Phase.Migrating, Phase.Created);
  no(Phase.Migrating, Phase.Running);
  no(Phase.Migrating, Phase.Paused);
  no(Phase.Migrating, Phase.Migrating);


  // check if everyting is migrated
  no(Phase.Migrating, Phase.Migrated);
  // burn all
  ok(Phase.Migrating, Phase.Migrated);

  no(Phase.Migrated, Phase.Created);
  no(Phase.Migrated, Phase.Running);
  no(Phase.Migrated, Phase.Paused);
  no(Phase.Migrated, Phase.Migrating);
  no(Phase.Migrated, Phase.Migrated);

  // - buy
  // + withdraw
  // - selfdestruct
})
