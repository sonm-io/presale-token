During its lifetime presale contract passes through several *phases*. Each
phase determines which functions can be called on the contract. Token managers
are able to switch phases according to rules described below.

Switching phases and calling administrative functions is possible only by
joint decision of token managers.


Phases
------

There are five phases:
  - **Created**. Contract is just created and investors are not yet able to
    buy tokens. Token managers can start presale.
  - **Running**. Investors can buy tokens (until presale limit is reached).
    Token managers are able to temporarily pause presale or switch to
    migration phase.
  - **Paused**. Investors can't buy tokens. Token managers can resume presale
    or switch to migration phase.
  - **Migrating**. Presale is over, investors can't buy tokens but can
    exchange their presale tokens for real tokens via the crowdsale contract.
  - **Migrated**. Presale contract automatically switches to this phase when
    all tokes are successfully migrated. At this phase presale is totally
    finished.


 Management Functions
---------------------

  - `tokenWithdrawEther`. This function moves all collected Ether to token
    manager's multisig account. The function can be called at any presale
    phase any number of times.
  - `tokenSetPresalePhase`. Allows to switch presale phases. Only specific
    phase transitions that comply to this state diagram are allowed:


```
                  +-----------+
                  |           |
               +-->  Running  +---------+
               |  |           |         |
+-----------+  |  +--+----^---+  +------v-------+     +-----------+
|           |  |     |    |      |              |     |           |
|  Created  +--+     |    |      |  Migrating   +-----> Migrated  |
|           |        |    |      |              |     |           |
+-----------+        |    |      +------^-------+     +-----------+
                  +--v----+---+         |
                  |           |         |
                  |  Paused   +---------+
                  |           |
                  +-----------+
```

  - `tokenSetCrowdsaleManager`. This function allows to set crowdsale manager
    contract address. Crowdsale manager is responsible for migrating presale
    tokens and has exclusive rights to burn presale tokens after migration.
    Valid crowdsale manager address is required to switch to *Migrating*
    phase. It is not possible to change crowdsale manager address when
    migration is in progress.
