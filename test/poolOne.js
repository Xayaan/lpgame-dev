const { expectRevert } = require('@openzeppelin/test-helpers');
const Crypt = artifacts.require('mocks/crypt.sol');

const PoolOne = artifacts.require('PoolOne.sol');

function increaseTime(addSeconds) {
    const id = Date.now();

    return new Promise((resolve, reject) => {
      web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [addSeconds],
        id,
      }, (err1) => {
        if (err1) return reject(err1);

        web3.currentProvider.send({
          jsonrpc: '2.0',
          method: 'evm_mine',
          id: id + 1,
        }, (err2, res) => (err2 ? reject(err2) : resolve(res)));
      });
    });
  }

contract('PoolOne', (accounts) => {

    const [trader1, trader2, trader3, trader4] = [accounts[1],accounts[2],accounts[3],accounts[4]];

    beforeEach(async() => {
        crypt = await Crypt.new();
        gRoy = await Crypt.new();
        pool = await PoolOne.new(crypt.address, gRoy.address ,5000,4,30)

        const amount = web3.utils.toWei('1000');
        const poolAmount = web3.utils.toWei('5000');
        const seedTokenBalance = async (token, address) => {
            await token.faucet(address, amount);
            await token.approve(
                pool.address,
                amount,
                {from: address}
            );
        };

        await Promise.all(
            [trader1, trader2, trader3, trader4].map(
                address => seedTokenBalance(crypt, address)
            ),
            crypt.faucet(pool.address, poolAmount),
            gRoy.faucet(pool.address, poolAmount)
        );
    });

    it('Test 1: should deposit and withdraw tokens', async () => {
        const amount = web3.utils.toWei('1');
        const amountPostReflection = web3.utils.toWei('.95')
        await increaseTime(1);

        await pool.stake(
            amount,
            {from: trader1}
        );

        const traderPoolTokens = await pool.stakers(trader1);
        // const stakeholder1 = await pool.stakeHolders.call(0);
        const stakedBalance = await pool.stakedBalances.call(trader1);
        const percentageOfPool = await pool.percentageOfPool.call(trader1);

        assert(traderPoolTokens["cycleJoined"].toString() === "1");
        assert(traderPoolTokens["numberOfDeposits"].toString() === "1");
        assert(traderPoolTokens["poolTokens"].toString() === "1000", "number of pooltokens for trader1 should be 1000");
        assert(traderPoolTokens["pendingTokens"].toString() === "0");
        assert(traderPoolTokens["rewards"].toString() === "0");
        assert(traderPoolTokens["totalRewards"].toString() === "0");

        assert(stakedBalance.toString() === amountPostReflection);
        // assert(stakeholder1.toString() === trader1);
        assert(percentageOfPool.toString() === "10000");

        await expectRevert(//let's make sure we don't get the full amount back
        pool.withdraw(
            amount,
            {from: trader1}
        ), "not enough funds.");

        await pool.withdraw(
            amountPostReflection,
            {from: trader1}
        );

        const traderPoolTokens2 = await pool.stakers(trader1);
        // const stakeholder2 = await pool.stakeHolders.call(0);
        const stakedBalance2 = await pool._stakedBalances(trader1);
        const percentageOfPool2 = await pool.percentageOfPool.call(trader1);

        assert(traderPoolTokens2["cycleJoined"].toString() === "1");
        assert(traderPoolTokens2["numberOfDeposits"].toString() === "1");
        assert(traderPoolTokens2["poolTokens"].toString() === "0", "number of pooltokens for trader1 should be 0");
        assert(traderPoolTokens2["pendingTokens"].toString() === "0");
        assert(traderPoolTokens2["rewards"].toString() === "0");
        assert(traderPoolTokens2["totalRewards"].toString() === "0");

        assert(stakedBalance2.toString() === "0");
        // assert(stakeholder2.toString() === trader1);
        assert(percentageOfPool2.toString() === "0");

    });

    it('Test 2: should deposit once at beginning of 3rd cycle and withdraw tokens way AFTER THE END', async () => {
        const amount = web3.utils.toWei('1');
        const amountPostReflection = web3.utils.toWei('.95')
        await increaseTime(61); //beginning of 3rd cycle

        await pool.stake(
            amount,
            {from: trader1}
        );

        const traderPoolTokens = await pool.stakers(trader1);
        // const stakeholder1 = await pool.stakeHolders.call(0);
        const stakedBalance = await pool.stakedBalances.call(trader1);
        const percentageOfPool = await pool.percentageOfPool.call(trader1)

        assert(traderPoolTokens["cycleJoined"].toString() === "3");
        assert(traderPoolTokens["numberOfDeposits"].toString() === "1");
        assert(traderPoolTokens["poolTokens"].toString() === "1000", "number of pooltokens for trader1 should be 1000");
        assert(traderPoolTokens["pendingTokens"].toString() === "0");
        assert(traderPoolTokens["rewards"].toString() === "0");
        assert(traderPoolTokens["totalRewards"].toString() === "0");

        assert(stakedBalance.toString() === web3.utils.toWei('0.95'));
        // assert(stakeholder1.toString() === trader1);
        assert(percentageOfPool.toString() === "10000");
        await increaseTime(1000);
        await expectRevert(//let's make sure we don't get the full amount back
        pool.withdraw(
            amount,
            {from: trader1}
        ), "not enough funds.");

        await pool.withdraw(
            amountPostReflection,
            {from: trader1}
        );
        // await pool.checkTheShit();

        // const rpt = await pool.getCycleRewardsPerToken();
        // const rpts = rpt.toString();
        // console.log(rpts);
        // console.log(traderPoolTokens2["rewards"].toString())
        await pool.withdrawGroy(
            web3.utils.toWei('5000'),
            {from: trader1}
        );

        const traderPoolTokens2 = await pool.stakers(trader1);
        // const stakeholder2 = await pool.stakeHolders.call(0);
        const stakedBalance2 = await pool.stakedBalances.call(trader1);
        const percentageOfPool2 = await pool.percentageOfPool.call(trader1)
        const currentCycle = await pool.currentCycle.call();
        // console.log("currentcycle " + currentCycle.toString())
        // console.log(traderPoolTokens2["cycleJoined"].toString())
        // console.log(traderPoolTokens2["numberOfDeposits"].toString())
        // console.log(traderPoolTokens2["poolTokens"].toString())
        // console.log(traderPoolTokens2["pendingTokens"].toString())
        // console.log(traderPoolTokens2["rewards"].toString())
        // console.log(traderPoolTokens2["totalRewards"].toString())

        assert(traderPoolTokens2["cycleJoined"].toString() === "3");
        assert(traderPoolTokens2["numberOfDeposits"].toString() === "1");
        assert(traderPoolTokens2["poolTokens"].toString() === "0", "number of pooltokens for trader2 should be 0");
        assert(traderPoolTokens2["pendingTokens"].toString() === "0");
        assert(traderPoolTokens2["rewards"].toString() === "0", traderPoolTokens2["rewards"].toString());
        assert(traderPoolTokens2["totalRewards"].toString() === web3.utils.toWei('5000'), "should be 5000 " + traderPoolTokens2["totalRewards"].toString());
        assert(stakedBalance2.toString() === "0");
        // assert(stakeholder2.toString() === trader1);
        assert(percentageOfPool2.toString() === "0");

    });


    // it('Test 3: should deposit tokens after half first cycle', async () => {
    //     const amount = web3.utils.toWei('1');
    //     await increaseTime(17);

    //     await pool.stake(
    //         amount,
    //         {from: trader1}
    //     );

    //     const traderPoolTokens = await pool.stakers(trader1);
    //     const stakeholder1 = await pool.stakeHolders.call(0);
    //     const stakedBalance = await pool.stakedBalances.call(trader1);
    //     const percentageOfPool = await pool.percentageOfPool.call(trader1)

    //     assert(traderPoolTokens["cycleJoined"].toString() === "1");
    //     assert(traderPoolTokens["numberOfDeposits"].toString() === "1");
    //     assert(traderPoolTokens["poolTokens"].toString() === "0", "number of pooltokens for trader1 should be 0");
    //     assert(traderPoolTokens["pendingTokens"].toString() === "1000");
    //     assert(traderPoolTokens["rewards"].toString() === "0");
    //     assert(traderPoolTokens["totalRewards"].toString() === "0");

    //     assert(stakedBalance.toString() === web3.utils.toWei('0.95'));
    //     assert(stakeholder1.toString() === trader1);
    //     assert(percentageOfPool.toString() === "0");
    // });

    // it('Test : should deposit tokens from two', async () => {
    //     const amount = web3.utils.toWei('100');
    //     await increaseTime(1);

    //     await pool.stake(
    //         amount,
    //         {from: trader1}
    //     );
    //     const stakedBalance = await pool.stakedBalances.call(trader1);
    //     assert(stakedBalance.toString() === web3.utils.toWei('95'), "staked balance 1 should be 95wei not " + stakedBalance.toString());
    //     await pool.stake(
    //         amount,
    //         {from: trader2}
    //     );
    //     //1
    //     const trader1PoolTokens = await pool.stakers(trader1);
    //     const stakeholder1 = await pool.stakeHolders.call(0);
    //     const stakedBalance1 = await pool.stakedBalances.call(trader1);
    //     const percentageOfPool1 = await pool.percentageOfPool.call(trader1)

    //     assert(trader1PoolTokens["cycleJoined"].toString() === "1");
    //     assert(trader1PoolTokens["numberOfDeposits"].toString() === "1");
    //     assert(trader1PoolTokens["poolTokens"].toString() === "100000", "Wrong pool tokens for user1 yo " + trader1PoolTokens["poolTokens"].toString() + " should be 100000");
    //     assert(trader1PoolTokens["pendingTokens"].toString() === "0");
    //     assert(trader1PoolTokens["rewards"].toString() === "0");
    //     assert(trader1PoolTokens["totalRewards"].toString() === "0");
    //     // console.log(stakedBalance1.toString())
    //     assert(stakedBalance1.toString() === web3.utils.toWei('97.5'), "staked balance 1 should be 97.5wei not " + stakedBalance1.toString());
    //     assert(stakeholder1.toString() === trader1);
    //     assert(percentageOfPool1.toString() === "5000", "no?");//WTF HOW DID I BREAK THIS, NOW I WONDER IF I broke it somewhere

    //     //2
    //     const trader2PoolTokens = await pool.stakers(trader2);
    //     const stakeholder2 = await pool.stakeHolders.call(1);
    //     const stakedBalance2 = await pool.stakedBalances.call(trader2);
    //     const percentageOfPool2 = await pool.percentageOfPool.call(trader2)

    //     assert(trader2PoolTokens["cycleJoined"].toString() === "1");
    //     assert(trader2PoolTokens["numberOfDeposits"].toString() === "1");
    //     assert(trader2PoolTokens["poolTokens"].toString() === "100000");
    //     assert(trader2PoolTokens["pendingTokens"].toString() === "0");
    //     assert(trader2PoolTokens["rewards"].toString() === "0");
    //     assert(trader2PoolTokens["totalRewards"].toString() === "0");

    //     assert(stakedBalance2.toString() === web3.utils.toWei('95'), "staked balance 2 should be 95");
    //     assert(stakeholder2.toString() === trader2);
    //     assert(percentageOfPool2.toString() === "5000");
    // });//tests done

    // it('Test 4: should deposit tokens from two after half of first cycle', async () => {
    //     const amount = web3.utils.toWei('100');
    //     await increaseTime(17);

    //     await pool.stake(
    //         amount,
    //         {from: trader1}
    //     );
    //     // const TPT = await pool.totalPoolTokens.call();
    //     // assert(TPT === "10", "TPT is " + TPT)

    //     await pool.stake(
    //         amount,
    //         {from: trader2}
    //     );
    //     //1
    //     const trader1PoolTokens = await pool.stakers(trader1);
    //     const stakeholder1 = await pool.stakeHolders.call(0);
    //     const stakedBalance1 = await pool.stakedBalances.call(trader1);
    //     const percentageOfPool1 = await pool.percentageOfPool.call(trader1)

    //     assert(trader1PoolTokens["cycleJoined"].toString() === "1");
    //     assert(trader1PoolTokens["numberOfDeposits"].toString() === "1");
    //     assert(trader1PoolTokens["poolTokens"].toString() === "0", "Wrong pool tokens for user1 yo " + trader1PoolTokens["poolTokens"].toString() + " should be 0 we are in the second part of the cycle");
    //     assert(trader1PoolTokens["pendingTokens"].toString() === "100000");
    //     assert(trader1PoolTokens["rewards"].toString() === "0");
    //     assert(trader1PoolTokens["totalRewards"].toString() === "0");
    //     // console.log("287",stakedBalance1.toString())
    //     assert(stakedBalance1.toString() === web3.utils.toWei('97.5'), "staked balance 1 should be 97.5 from one reflection");
    //     assert(stakeholder1.toString() === trader1);
    //     assert(percentageOfPool1.toString() === "0");

    //     //2
    //     const trader2PoolTokens = await pool.stakers(trader2);
    //     const stakeholder2 = await pool.stakeHolders.call(1);
    //     const stakedBalance2 = await pool.stakedBalances.call(trader2);
    //     const percentageOfPool2 = await pool.percentageOfPool.call(trader2)

    //     assert(trader2PoolTokens["cycleJoined"].toString() === "1");
    //     assert(trader2PoolTokens["numberOfDeposits"].toString() === "1");
    //     assert(trader2PoolTokens["poolTokens"].toString() === "0");
    //     assert(trader2PoolTokens["pendingTokens"].toString() === "100000");
    //     assert(trader2PoolTokens["rewards"].toString() === "0");
    //     assert(trader2PoolTokens["totalRewards"].toString() === "0");

    //     assert(stakedBalance2.toString() === web3.utils.toWei('95'), "staked balance 2 should be 95");
    //     assert(stakeholder2.toString() === trader2);
    //     assert(percentageOfPool2.toString() === "0");
    //     const stakedBalance3 = await pool.stakedBalances.call(trader1);
    //     // console.log(stakedBalance3.toString())
    // });//tests copied

    // it('Test 5: should deposit tokens in each half of first round and first round of second round', async () => {
    //     const amount = web3.utils.toWei('1');
    //     await increaseTime(1);

    //     await pool.stake(//beginning of first cycle
    //         amount,
    //         {from: trader1}
    //     );

    //     await increaseTime(17);

    //     await pool.stake(//end of first cycle
    //         amount,
    //         {from: trader1}
    //     );

    //     await increaseTime(17);

    //     await pool.stake(//beginning of 2nd cycle
    //         amount,
    //         {from: trader1}
    //     );

    //     const traderPoolTokens = await pool.stakers(trader1);
    //     const stakeholder1 = await pool.stakeHolders.call(0);
    //     const stakedBalance = await pool.stakedBalances.call(trader1);
    //     const percentageOfPool = await pool.percentageOfPool.call(trader1)

    //     assert(traderPoolTokens["cycleJoined"].toString() === "1");
    //     assert(traderPoolTokens["numberOfDeposits"].toString() === "3");
    //     assert(traderPoolTokens["poolTokens"].toString() === "3000", "number of pooltokens for trader1 should be 3000 "+ traderPoolTokens["poolTokens"]);
    //     assert(traderPoolTokens["pendingTokens"].toString() === "0");
    //     assert(traderPoolTokens["rewards"].toString() === web3.utils.toWei('1250'));
    //     assert(traderPoolTokens["totalRewards"].toString() === web3.utils.toWei('1250'));

    //     assert(stakedBalance.toString() === web3.utils.toWei('2.85'), "should be 2.85 because of 3 reflections " + stakedBalance.toString());
    //     assert(stakeholder1.toString() === trader1);
    //     assert(percentageOfPool.toString() === "10000", percentageOfPool.toString());
    // });//tests copied

    // it('Test 6: should deposit tokens in each half of first round and first round of second round, once in the first part of the 3rd round', async () => {
    //     const amount = web3.utils.toWei('1');
    //     await increaseTime(1); //beginning of 1st round

    //     await pool.stake(
    //         amount,
    //         {from: trader1}
    //     );
    //     const rpt = await pool.getCycleRewardsPerToken()
    //     const rpts = rpt.toString()
    //     const tstakers = await pool.stakers(trader1);
    //     const trewards = tstakers["rewards"].toString()
    //     const tptokens = tstakers["poolTokens"].toString()
    //     await increaseTime(16); //end of 1st round

    //     await pool.stake(
    //         amount,
    //         {from: trader1}
    //     );
    //     const rpt2 = await pool.getCycleRewardsPerToken()
    //     const rpts2 = rpt2.toString()
    //     const tstakers2 = await pool.stakers(trader1);
    //     const trewards2 = tstakers2["rewards"].toString()
    //     const tptokens2 = tstakers2["poolTokens"].toString()
    //     await increaseTime(16); //beginning of 2nd round

    //     await pool.stake(
    //         amount,
    //         {from: trader1}
    //     );
    //     const rpt3 = await pool.getCycleRewardsPerToken()
    //     const rpts3 = rpt3.toString()
    //     const tstakers3 = await pool.stakers(trader1);
    //     const trewards3 = tstakers3["rewards"].toString()
    //     const tptokens3 = tstakers3["poolTokens"].toString()
    //     await increaseTime(30); //beginning of 3rd round

    //     await pool.stake(
    //         amount,
    //         {from: trader1}
    //     );
    //     const rpt4 = await pool.getCycleRewardsPerToken()
    //     const rpts4 = rpt4.toString()
    //     const tstakers4 = await pool.stakers(trader1);
    //     const trewards4 = tstakers4["rewards"].toString()
    //     const tptokens4 = tstakers4["poolTokens"].toString()

    //     const traderPoolTokens = await pool.stakers(trader1);
    //     const stakeholder1 = await pool.stakeHolders.call(0);
    //     const stakedBalance = await pool.stakedBalances.call(trader1);
    //     const percentageOfPool = await pool.percentageOfPool.call(trader1)

    //     assert(traderPoolTokens["cycleJoined"].toString() === "1");
    //     assert(traderPoolTokens["numberOfDeposits"].toString() === "4");
    //     assert(traderPoolTokens["poolTokens"].toString() === "4000", "number of pooltokens for trader1 should be 3000" + traderPoolTokens["poolTokens"]);
    //     assert(traderPoolTokens["pendingTokens"].toString() === "0");
    //     assert(traderPoolTokens["rewards"].toString() === "2499999999999999998000", "should be 2499999999999999998000 " + traderPoolTokens["rewards"].toString());
    //     assert(traderPoolTokens["totalRewards"].toString() === "2499999999999999998000");
    //     assert(stakedBalance.toString() === web3.utils.toWei('3.8'), "should be? " + stakedBalance.toString());
    //     assert(stakeholder1.toString() === trader1);
    //     assert(percentageOfPool.toString() === "10000", percentageOfPool.toString());
    // });

    // it('Test 7: should deposit tokens in each half of first round and first round of second round, once in the first part of the 3rd round, once in the first part of the 4th round', async () => {
    //     const amount = web3.utils.toWei('1');
    //     await increaseTime(1); //beginning of 1st round

    //     await pool.stake(
    //         amount,
    //         {from: trader1}
    //     );

    //     await increaseTime(16); //end of 1st round

    //     await pool.stake(
    //         amount,
    //         {from: trader1}
    //     );

    //     await increaseTime(16); //beginning of 2nd round

    //     await pool.stake(
    //         amount,
    //         {from: trader1}
    //     );

    //     await increaseTime(30); //beginning of 3rd round

    //     await pool.stake(
    //         amount,
    //         {from: trader1}
    //     );

    //     await increaseTime(31); //beginning of last round

    //     await pool.stake(
    //         amount,
    //         {from: trader1}
    //     );

    //     const traderPoolTokens = await pool.stakers(trader1);
    //     const stakeholder1 = await pool.stakeHolders.call(0);
    //     const stakedBalance = await pool.stakedBalances.call(trader1);
    //     const percentageOfPool = await pool.percentageOfPool.call(trader1)

    //     assert(traderPoolTokens["cycleJoined"].toString() === "1");
    //     assert(traderPoolTokens["numberOfDeposits"].toString() === "5");
    //     assert(traderPoolTokens["poolTokens"].toString() === "5000", "number of pooltokens for trader1 should be 5000, got "+traderPoolTokens["poolTokens"].toString());
    //     assert(traderPoolTokens["pendingTokens"].toString() === "0", "number of pendingtokens for trader1 should be 0, got "+traderPoolTokens["pendingTokens"].toString());
    //     assert(traderPoolTokens["rewards"].toString() === "3749999999999999998000", traderPoolTokens["rewards"].toString());
    //     assert(traderPoolTokens["totalRewards"].toString() === "3749999999999999998000");

    //     assert(stakedBalance.toString() === web3.utils.toWei('4.75'), "should be ? " + stakedBalance.toString());
    //     assert(stakeholder1.toString() === trader1);
    //     assert(percentageOfPool.toString() === "10000", percentageOfPool.toString());
    // });

    // it('Test 8: should deposit tokens in each half of first round and first round of second round, once in the first part of the 3rd round, once in the first part of the 4th round, and once in the last part of 4th round', async () => {
    //     const amount = web3.utils.toWei('1');
    //     await increaseTime(1); //beginning of 1st round

    //     await pool.stake(
    //         amount,
    //         {from: trader1}
    //     );

    //     await increaseTime(16); //end of 1st round

    //     await pool.stake(
    //         amount,
    //         {from: trader1}
    //     );

    //     await increaseTime(16); //beginning of 2nd round

    //     await pool.stake(
    //         amount,
    //         {from: trader1}
    //     );

    //     await increaseTime(30); //beginning of 3rd round

    //     await pool.stake(
    //         amount,
    //         {from: trader1}
    //     );

    //     await increaseTime(31); //beginning of last round

    //     await pool.stake(
    //         amount,
    //         {from: trader1}
    //     );

    //     await increaseTime(15); //beginning of last round

    //     await expectRevert(
    //         pool.stake(
    //             amount,
    //             {from: trader1}
    //         ), "You have missed the last deposit cutoff, watch Dark to learn more about the Last Cycle.");
    // });



    // it('Test 9: should deposit tokens in each half of first round and first round of second round, once in the first part of the 3rd round, once in the first part of the 4th round, withdraw after contract end', async () => {
    //     const amount = web3.utils.toWei('1');
    //     const withdrawAmount = web3.utils.toWei('4.75');
    //     await increaseTime(1); //beginning of 1st round

    //     await pool.stake(
    //         amount,
    //         {from: trader1}
    //     );

    //     await increaseTime(16); //end of 1st round

    //     await pool.stake(
    //         amount,
    //         {from: trader1}
    //     );

    //     await increaseTime(16); //beginning of 2nd round

    //     await pool.stake(
    //         amount,
    //         {from: trader1}
    //     );

    //     await increaseTime(30); //beginning of 3rd round

    //     await pool.stake(
    //         amount,
    //         {from: trader1}
    //     );

    //     // await increaseTime(31); //beginning of last round

    //     await pool.stake(
    //         amount,
    //         {from: trader1}
    //     );

    //     await increaseTime(31); //It's the end

    //     await pool.withdraw(
    //         withdrawAmount,
    //         {from: trader1}
    //     );
    //     await pool.withdrawGroy(
    //         "3749999999999999998000",
    //         {from: trader1}
    //     );

    //     const traderPoolTokens = await pool.stakers(trader1);
    //     const stakeholder1 = await pool.stakeHolders.call(0);
    //     const stakedBalance = await pool.stakedBalances.call(trader1);

    //     const percentageOfPool = await pool.percentageOfPool.call(trader1)

    //     assert(traderPoolTokens["cycleJoined"].toString() === "1");
    //     assert(traderPoolTokens["numberOfDeposits"].toString() === "5");
    //     assert(traderPoolTokens["poolTokens"].toString() === "0", "number of pooltokens for trader1 should be 0, got "+traderPoolTokens["poolTokens"].toString());
    //     assert(traderPoolTokens["pendingTokens"].toString() === "0", "number of pendingtokens for trader1 should be 0, got "+traderPoolTokens["pendingTokens"].toString());
    //     assert(traderPoolTokens["rewards"].toString() === "0", traderPoolTokens["rewards"].toString());
    //     assert(traderPoolTokens["totalRewards"].toString() === "3749999999999999998000", traderPoolTokens["totalRewards"].toString());

    //     assert(stakedBalance.toString() === "0");
    //     assert(stakeholder1.toString() === trader1);
    //     assert(percentageOfPool.toString() === "0", percentageOfPool.toString());
    // });

    // it('Test 10: Player 2 enters the room should deposit and withdraw tokens', async () => {
    //     const amount = web3.utils.toWei('1');
    //     await increaseTime(1);

    //     await pool.stake(
    //         amount,
    //         {from: trader1}
    //     );
    //     const stakedBalanceStakeOne = await pool.stakedBalances.call(trader1);
    //     assert(stakedBalanceStakeOne.toString() === web3.utils.toWei('0.95'), "trader1 should have 0.95 staked balance after reflection");

    //     const totalStaked = await pool.totalStaked();
    //     assert(totalStaked.toString() === web3.utils.toWei('1'));
    //     const totalPoolTokens = await pool.totalPoolTokens();
    //     assert(totalPoolTokens.toString() === "1000");

    //     await pool.stake(
    //         amount,
    //         {from: trader2}
    //     );
    //     const stakedBalanceStakeTwo1 = await pool.stakedBalances.call(trader1);
    //     assert(stakedBalanceStakeTwo1.toString() === web3.utils.toWei('0.975'), "trader1 should have 0.95 staked balance after reflection");
    //     const stakedBalanceStakeTwo2 = await pool.stakedBalances.call(trader2);
    //     assert(stakedBalanceStakeTwo2.toString() === web3.utils.toWei('0.95'), "trader1 should have 0.95 staked balance after reflection");

    //     const totalStaked2 = await pool.totalStaked();
    //     assert(totalStaked2.toString() === web3.utils.toWei('2'));
    //     const totalPoolTokens2 = await pool.totalPoolTokens();
    //     assert(totalPoolTokens2.toString() === "2000");

    //     const traderPoolTokens = await pool.stakers(trader1);
    //     const stakeholder1 = await pool.stakeHolders.call(0);
    //     const stakedBalance = await pool.stakedBalances.call(trader1);
    //     const percentageOfPool = await pool.percentageOfPool.call(trader1)

    //     assert(traderPoolTokens["cycleJoined"].toString() === "1");
    //     assert(traderPoolTokens["numberOfDeposits"].toString() === "1");
    //     assert(traderPoolTokens["poolTokens"].toString() === "1000", "number of pooltokens for trader1 should be 1000");
    //     assert(traderPoolTokens["pendingTokens"].toString() === "0");
    //     assert(traderPoolTokens["rewards"].toString() === "0");
    //     assert(traderPoolTokens["totalRewards"].toString() === "0");

    //     assert(stakedBalance.toString() === web3.utils.toWei('0.975'), "should be 975" + stakedBalance.toString());
    //     assert(stakeholder1.toString() === trader1);
    //     assert(percentageOfPool.toString() === "5000");

    //     const traderPoolTokens2 = await pool.stakers(trader2);
    //     const stakeholder2 = await pool.stakeHolders.call(1);
    //     const stakedBalance2 = await pool.stakedBalances.call(trader2);
    //     const percentageOfPool2 = await pool.percentageOfPool.call(trader2)

    //     assert(traderPoolTokens2["cycleJoined"].toString() === "1");
    //     assert(traderPoolTokens2["numberOfDeposits"].toString() === "1");
    //     assert(traderPoolTokens2["poolTokens"].toString() === "1000", "number of pooltokens for trader1 should be 1000");
    //     assert(traderPoolTokens2["pendingTokens"].toString() === "0");
    //     assert(traderPoolTokens2["rewards"].toString() === "0");
    //     assert(traderPoolTokens2["totalRewards"].toString() === "0");

    //     assert(stakedBalance2.toString() === web3.utils.toWei('0.95'));
    //     assert(stakeholder2.toString() === trader2);
    //     assert(percentageOfPool2.toString() === "5000");

    //     await pool.withdraw(
    //         web3.utils.toWei('0.975'),
    //         {from: trader1}
    //     );
    //     const trader1Balance = await crypt.balanceOf.call(trader1)
    //     assert(trader1Balance.toString() === web3.utils.toWei('999.92625'), "must be 999.92625 and not " +trader1Balance.toString());//CONFIRMED WITH DOUBLE REFLECTION CALCULATIONS 0.974375
    //     const stakedBalanceAfterOneWithdrawal = await pool.stakedBalances.call(trader2);
    //     assert(stakedBalanceAfterOneWithdrawal.toString() === web3.utils.toWei('0.974375'), stakedBalanceAfterOneWithdrawal.toString());

    //     const totalStakedWithdraw1 = await pool.totalStaked();
    //     assert(totalStakedWithdraw1.toString() === web3.utils.toWei('2'), totalStakedWithdraw1.toString());//.95+.95-.975 = 0.925

    //     const traderPoolTokens3 = await pool.stakers(trader1);
    //     const stakeholder3 = await pool.stakeHolders.call(0);
    //     const stakedBalance3 = await pool.stakedBalances.call(trader1);
    //     const percentageOfPool3 = await pool.percentageOfPool.call(trader1)

    //     assert(traderPoolTokens3["cycleJoined"].toString() === "1");
    //     assert(traderPoolTokens3["numberOfDeposits"].toString() === "1");
    //     assert(traderPoolTokens3["poolTokens"].toString() === "0", "number of pooltokens for trader1 should be 0", traderPoolTokens3["poolTokens"].toString());
    //     assert(traderPoolTokens3["pendingTokens"].toString() === "0");
    //     assert(traderPoolTokens3["rewards"].toString() === "0");
    //     assert(traderPoolTokens3["totalRewards"].toString() === "0");

    //     assert(stakedBalance3.toString() === "0");
    //     assert(stakeholder3.toString() === trader1);
    //     assert(percentageOfPool3.toString() === "0");

    //     const totalStaked3 = await pool.totalStaked();
    //     assert(totalStaked3.toString() === web3.utils.toWei('2'), "should be? " + totalStaked3.toString());
    //     const totalPoolTokens3 = await pool.totalPoolTokens();
    //     assert(totalPoolTokens3.toString() === "1000");
    //     const stakedBalanceLog = await pool.stakedBalances.call(trader2);
    //     // console.log(totalStaked3.toString(), " total staked")
    //     // console.log(stakedBalanceLog.toString(), " staked balance")

    //     await pool.withdraw(
    //         web3.utils.toWei('0.974375'), //0.974375 is confirmed from legit reflection calculations
    //         {from: trader2}
    //     );

    //     const traderPoolTokens4 = await pool.stakers(trader2);
    //     const stakeholder4 = await pool.stakeHolders.call(1);
    //     const stakedBalance4 = await pool.stakedBalances.call(trader2);
    //     const percentageOfPool4 = await pool.percentageOfPool.call(trader2)

    //     assert(traderPoolTokens4["cycleJoined"].toString() === "1");
    //     assert(traderPoolTokens4["numberOfDeposits"].toString() === "1");
    //     assert(traderPoolTokens4["poolTokens"].toString() === "0", "number of pooltokens for trader1 should be 0");
    //     assert(traderPoolTokens4["pendingTokens"].toString() === "0");
    //     assert(traderPoolTokens4["rewards"].toString() === "0");
    //     assert(traderPoolTokens4["totalRewards"].toString() === "0");

    //     assert(stakedBalance4.toString() === "0");
    //     assert(stakeholder4.toString() === trader2);
    //     assert(percentageOfPool4.toString() === "0");

    //     const totalStaked4 = await pool.totalStaked();
    //     assert(totalStaked4.toString() === web3.utils.toWei('2'), "are reflections still here?" +  totalStaked4.toString());
    //     const totalPoolTokens4 = await pool.totalPoolTokens();
    //     assert(totalPoolTokens4.toString() === "0");
    // });

    // it('Test 11: Player 2 shares in the rewards of round 1, should deposit tokens in each half of first round and first half of second round', async () => {
    //     const amount = web3.utils.toWei('1');
    //     await increaseTime(1);

    //     await pool.stake(//beginning of first cycle
    //         amount,
    //         {from: trader1}
    //     );

    //     await pool.stake(//beginning of first cycle
    //         amount,
    //         {from: trader2}
    //     );

    //     await increaseTime(17);

    //     await pool.stake(//end of first cycle
    //         amount,
    //         {from: trader1}
    //     );

    //     await increaseTime(17);

    //     await pool.stake(//beginning of 2nd cycle
    //         amount,
    //         {from: trader1}
    //     );

    //     const traderPoolTokens = await pool.stakers(trader1);
    //     const stakeholder1 = await pool.stakeHolders.call(0);
    //     const stakedBalance = await pool.stakedBalances.call(trader1);
    //     const percentageOfPool = await pool.percentageOfPool.call(trader1)

    //     assert(traderPoolTokens["cycleJoined"].toString() === "1");
    //     assert(traderPoolTokens["numberOfDeposits"].toString() === "3");
    //     assert(traderPoolTokens["poolTokens"].toString() === "3000", "number of pooltokens for trader1 should be 3000 "+ traderPoolTokens["poolTokens"]);
    //     assert(traderPoolTokens["pendingTokens"].toString() === "0");
    //     assert(traderPoolTokens["rewards"].toString() === web3.utils.toWei('625'), traderPoolTokens["rewards"].toString());
    //     assert(traderPoolTokens["totalRewards"].toString() === web3.utils.toWei('625'));

    //     assert(stakedBalance.toString() === web3.utils.toWei('2.875'), stakedBalance.toString());
    //     assert(stakeholder1.toString() === trader1);
    //     assert(percentageOfPool.toString() === "7500", percentageOfPool.toString());

    //     const traderPoolTokens2 = await pool.stakers(trader2);
    //     const stakeholder2 = await pool.stakeHolders.call(1);
    //     const stakedBalance2 = await pool.stakedBalances.call(trader2);
    //     const percentageOfPool2 = await pool.percentageOfPool.call(trader2)

    //     assert(traderPoolTokens2["cycleJoined"].toString() === "1");
    //     assert(traderPoolTokens2["numberOfDeposits"].toString() === "1");
    //     assert(traderPoolTokens2["poolTokens"].toString() === "1000", "number of pooltokens for trader1 should be 1000 "+ traderPoolTokens["poolTokens"]);
    //     assert(traderPoolTokens2["pendingTokens"].toString() === "0");
    //     assert(traderPoolTokens2["rewards"].toString() === web3.utils.toWei('625'));
    //     assert(traderPoolTokens2["totalRewards"].toString() === web3.utils.toWei('625'));

    //     assert(stakedBalance2.toString() === web3.utils.toWei('1'));
    //     assert(stakeholder2.toString() === trader2);
    //     assert(percentageOfPool2.toString() === "2500", percentageOfPool2.toString());
    // });

    // it('Test 12: Player 2 shares in the rewards of round 1, should deposit tokens in each half of first round and first round of second round, player 2 puts more in the third round ', async () => {
    //     const amount = web3.utils.toWei('1');
    //     await increaseTime(1);

    //     await pool.stake(//beginning of first cycle
    //         amount,
    //         {from: trader1}
    //     );

    //     await pool.stake(//beginning of first cycle
    //         amount,
    //         {from: trader2}
    //     );

    //     await increaseTime(17);

    //     await pool.stake(//end of first cycle
    //         amount,
    //         {from: trader1}
    //     );

    //     await increaseTime(17);

    //     await pool.stake(//beginning of 2nd cycle
    //         amount,
    //         {from: trader1}
    //     );

    //     await increaseTime(30);

    //     await pool.stake(//beginning of 3rd cycle
    //         amount,
    //         {from: trader2}
    //     );

    //     const traderPoolTokens = await pool.stakers(trader1);
    //     const stakeholder1 = await pool.stakeHolders.call(0);
    //     const stakedBalance = await pool.stakedBalances.call(trader1);
    //     const percentageOfPool = await pool.percentageOfPool.call(trader1)

    //     assert(traderPoolTokens["cycleJoined"].toString() === "1");
    //     assert(traderPoolTokens["numberOfDeposits"].toString() === "3");
    //     assert(traderPoolTokens["poolTokens"].toString() === "3000", "number of pooltokens for trader1 should be 3000 "+ traderPoolTokens["poolTokens"]);
    //     assert(traderPoolTokens["pendingTokens"].toString() === "0");
    //     assert(traderPoolTokens["rewards"].toString() === web3.utils.toWei('1562.5'));
    //     assert(traderPoolTokens["totalRewards"].toString() === web3.utils.toWei('1562.5'));

    //     assert(stakedBalance.toString() === "2899999999999999000", stakedBalance.toString());
    //     assert(stakeholder1.toString() === trader1);
    //     assert(percentageOfPool.toString() === "6000", percentageOfPool.toString());

    //     const traderPoolTokens2 = await pool.stakers(trader2);
    //     const stakeholder2 = await pool.stakeHolders.call(1);
    //     const stakedBalance2 = await pool.stakedBalances.call(trader2);
    //     const percentageOfPool2 = await pool.percentageOfPool.call(trader2)

    //     assert(traderPoolTokens2["cycleJoined"].toString() === "1");
    //     assert(traderPoolTokens2["numberOfDeposits"].toString() === "2");
    //     assert(traderPoolTokens2["poolTokens"].toString() === "2000", "number of pooltokens for trader1 should be 2000 "+ traderPoolTokens["poolTokens"]);
    //     assert(traderPoolTokens2["pendingTokens"].toString() === "0");
    //     assert(traderPoolTokens2["rewards"].toString() === web3.utils.toWei('937.5'));
    //     assert(traderPoolTokens2["totalRewards"].toString() === web3.utils.toWei('937.5'));

    //     assert(stakedBalance2.toString() === web3.utils.toWei('1.95'), stakedBalance2.toString());
    //     assert(stakeholder2.toString() === trader2);
    //     assert(percentageOfPool2.toString() === "4000", percentageOfPool2.toString());
    // });

    // it('Test 13: Player 2 shares in the rewards of round 1, should deposit tokens in each half of first round and first round of second round, player 2 puts more in the third round and withdraws at the end', async () => {
    //     const amount = web3.utils.toWei('1');
    //     await increaseTime(1);

    //     await pool.stake(//beginning of first cycle
    //         amount,
    //         {from: trader1}
    //     );

    //     await pool.stake(//beginning of first cycle
    //         amount,
    //         {from: trader2}
    //     );

    //     await increaseTime(17);

    //     await pool.stake(//end of first cycle
    //         amount,
    //         {from: trader1}
    //     );

    //     const traderPoolTokens11 = await pool.stakers(trader1);
    //     const stakeholder11 = await pool.stakeHolders.call(0);
    //     const stakedBalance11 = await pool.stakedBalances.call(trader1);
    //     const percentageOfPool11 = await pool.percentageOfPool.call(trader1)

    //     assert(traderPoolTokens11["cycleJoined"].toString() === "1");
    //     assert(traderPoolTokens11["numberOfDeposits"].toString() === "2");
    //     assert(traderPoolTokens11["poolTokens"].toString() === "1000", "number of pooltokens for trader1 should be 2000 "+ traderPoolTokens11["poolTokens"]);
    //     assert(traderPoolTokens11["pendingTokens"].toString() === "1000");
    //     assert(traderPoolTokens11["rewards"].toString() === web3.utils.toWei('0'), traderPoolTokens11["rewards"].toString());
    //     assert(traderPoolTokens11["totalRewards"].toString() === web3.utils.toWei('0'));

    //     assert(stakedBalance11.toString() === web3.utils.toWei('1.925'), stakedBalance11.toString());
    //     assert(stakeholder11.toString() === trader1);
    //     assert(percentageOfPool11.toString() === "5000", percentageOfPool11.toString());

    //     const traderPoolTokens21 = await pool.stakers(trader2);
    //     const stakeholder21 = await pool.stakeHolders.call(1);
    //     const stakedBalance21 = await pool.stakedBalances.call(trader2);
    //     const percentageOfPool21 = await pool.percentageOfPool.call(trader2)

    //     assert(traderPoolTokens21["cycleJoined"].toString() === "1");
    //     assert(traderPoolTokens21["numberOfDeposits"].toString() === "1");
    //     assert(traderPoolTokens21["poolTokens"].toString() === "1000", "number of pooltokens for trader1 should be 0 "+ traderPoolTokens21["poolTokens"]);
    //     assert(traderPoolTokens21["pendingTokens"].toString() === "0");
    //     assert(traderPoolTokens21["rewards"].toString() === web3.utils.toWei('0'));
    //     assert(traderPoolTokens21["totalRewards"].toString() === web3.utils.toWei('0'));

    //     assert(stakedBalance21.toString() === web3.utils.toWei('0.975'), stakedBalance21.toString());
    //     assert(stakeholder21.toString() === trader2);
    //     assert(percentageOfPool21.toString() === "5000", percentageOfPool21.toString());

    //     await increaseTime(17);

    //     await pool.stake(//beginning of 2nd cycle
    //         amount,
    //         {from: trader1}
    //     );

    //     const traderPoolTokens12 = await pool.stakers(trader1);
    //     const stakeholder12 = await pool.stakeHolders.call(0);
    //     const stakedBalance12 = await pool.stakedBalances.call(trader1);
    //     const percentageOfPool12 = await pool.percentageOfPool.call(trader1)

    //     assert(traderPoolTokens12["cycleJoined"].toString() === "1");
    //     assert(traderPoolTokens12["numberOfDeposits"].toString() === "3");
    //     assert(traderPoolTokens12["poolTokens"].toString() === "3000", "number of pooltokens for trader1 should be 3000 "+ traderPoolTokens12["poolTokens"]);
    //     assert(traderPoolTokens12["pendingTokens"].toString() === "0");
    //     assert(traderPoolTokens12["rewards"].toString() === web3.utils.toWei('625'), traderPoolTokens12["rewards"].toString());
    //     assert(traderPoolTokens12["totalRewards"].toString() === web3.utils.toWei('625'));

    //     assert(stakedBalance12.toString() === web3.utils.toWei('2.875'), stakedBalance12.toString());
    //     assert(stakeholder12.toString() === trader1);
    //     assert(percentageOfPool12.toString() === "7500", percentageOfPool12.toString());

    //     const traderPoolTokens22 = await pool.stakers(trader2);
    //     const stakeholder22 = await pool.stakeHolders.call(1);
    //     const stakedBalance22 = await pool.stakedBalances.call(trader2);
    //     const percentageOfPool22 = await pool.percentageOfPool.call(trader2)

    //     assert(traderPoolTokens22["cycleJoined"].toString() === "1");
    //     assert(traderPoolTokens22["numberOfDeposits"].toString() === "1");
    //     assert(traderPoolTokens22["poolTokens"].toString() === "1000", "number of pooltokens for trader1 should be 0 "+ traderPoolTokens22["poolTokens"]);
    //     assert(traderPoolTokens22["pendingTokens"].toString() === "0");
    //     assert(traderPoolTokens22["rewards"].toString() === web3.utils.toWei('625'));
    //     assert(traderPoolTokens22["totalRewards"].toString() === web3.utils.toWei('625'));

    //     assert(stakedBalance22.toString() === web3.utils.toWei('1'), stakedBalance22.toString() + web3.utils.toWei('1'));
    //     assert(stakeholder22.toString() === trader2);
    //     assert(percentageOfPool22.toString() === "2500", percentageOfPool22.toString());

    //     await increaseTime(30);

    //     await pool.stake(//beginning of 3rd cycle
    //         amount,
    //         {from: trader2}
    //     );

    //     const currentCycle = await pool.currentCycle.call()
    //     const cs = currentCycle.toString()
    //     // const lastDistributedCycle = await pool.lastDistributedCycle.call()
    //     // const ldc = lastDistributedCycle.toString()
    //     const totalDistributions = await pool.totalDistributions.call()
    //     const td = totalDistributions.toString()

    //     const traderPoolTokens13 = await pool.stakers(trader1);
    //     const stakeholder13 = await pool.stakeHolders.call(0);
    //     const stakedBalance13 = await pool.stakedBalances.call(trader1);
    //     const percentageOfPool13 = await pool.percentageOfPool.call(trader1)

    //     assert(traderPoolTokens13["cycleJoined"].toString() === "1");
    //     assert(traderPoolTokens13["numberOfDeposits"].toString() === "3");
    //     assert(traderPoolTokens13["poolTokens"].toString() === "3000", "number of pooltokens for trader1 should be 3000 "+ traderPoolTokens13["poolTokens"]);
    //     assert(traderPoolTokens13["pendingTokens"].toString() === "0");
    //     assert(traderPoolTokens13["rewards"].toString() === web3.utils.toWei('1562.5'), traderPoolTokens13["rewards"].toString());
    //     assert(traderPoolTokens13["totalRewards"].toString() === web3.utils.toWei('1562.5'));

    //     assert(stakedBalance13.toString() === "2899999999999999000", stakedBalance13.toString());
    //     assert(stakeholder13.toString() === trader1);
    //     assert(percentageOfPool13.toString() === "6000", percentageOfPool13.toString());

    //     const traderPoolTokens23 = await pool.stakers(trader2);
    //     const stakeholder23 = await pool.stakeHolders.call(1);
    //     const stakedBalance23 = await pool.stakedBalances.call(trader2);
    //     const percentageOfPool23 = await pool.percentageOfPool.call(trader2)

    //     assert(traderPoolTokens23["cycleJoined"].toString() === "1");
    //     assert(traderPoolTokens23["numberOfDeposits"].toString() === "2");
    //     assert(traderPoolTokens23["poolTokens"].toString() === "2000", "number of pooltokens for trader1 should be 0 "+ traderPoolTokens23["poolTokens"]);
    //     assert(traderPoolTokens23["pendingTokens"].toString() === "0");
    //     assert(traderPoolTokens23["rewards"].toString() === web3.utils.toWei('937.5'), traderPoolTokens23["rewards"].toString());
    //     assert(traderPoolTokens23["totalRewards"].toString() === web3.utils.toWei('937.5'));

    //     assert(stakedBalance23.toString() === web3.utils.toWei('1.95'), stakedBalance23.toString());
    //     assert(stakeholder23.toString() === trader2);
    //     assert(percentageOfPool23.toString() === "4000", percentageOfPool23.toString());

    //     await increaseTime(60); //end
    //     await pool.withdraw(
    //         web3.utils.toWei('1.95'),
    //         {from: trader2}
    //     );

    //     // const currentCycle = await pool.currentCycle.call()
    //     // const cs = currentCycle.toString()
    //     // const lastDistributedCycle = await pool.lastDistributedCycle.call()
    //     // const ldc = lastDistributedCycle.toString()
    //     // const totalDistributions = await pool.totalDistributions.call()
    //     // const td = totalDistributions.toString()

    //     const traderPoolTokens14 = await pool.stakers(trader1);
    //     const stakeholder14 = await pool.stakeHolders.call(0);
    //     const stakedBalance14 = await pool.stakedBalances.call(trader1);
    //     const percentageOfPool14 = await pool.percentageOfPool.call(trader1)

    //     assert(traderPoolTokens14["cycleJoined"].toString() === "1");
    //     assert(traderPoolTokens14["numberOfDeposits"].toString() === "3");
    //     assert(traderPoolTokens14["poolTokens"].toString() === "3000", "number of pooltokens for trader1 should be 3000 "+ traderPoolTokens14["poolTokens"]);
    //     assert(traderPoolTokens14["pendingTokens"].toString() === "0");
    //     assert(traderPoolTokens14["rewards"].toString() === web3.utils.toWei('3062.5'), traderPoolTokens14["rewards"].toString());
    //     assert(traderPoolTokens14["totalRewards"].toString() === web3.utils.toWei('3062.5'));

    //     assert(stakedBalance14.toString() === "2948749999999999000", stakedBalance14.toString());
    //     assert(stakeholder14.toString() === trader1);
    //     assert(percentageOfPool14.toString() === "10000", percentageOfPool14.toString());

    //     const traderPoolTokens24 = await pool.stakers(trader2);
    //     const stakeholder24 = await pool.stakeHolders.call(1);
    //     const stakedBalance24 = await pool.stakedBalances.call(trader2);
    //     const percentageOfPool24 = await pool.percentageOfPool.call(trader2)

    //     assert(traderPoolTokens24["cycleJoined"].toString() === "1");
    //     assert(traderPoolTokens24["numberOfDeposits"].toString() === "2");
    //     assert(traderPoolTokens24["poolTokens"].toString() === "0", "number of pooltokens for trader1 should be 0 "+ traderPoolTokens24["poolTokens"]);
    //     assert(traderPoolTokens24["pendingTokens"].toString() === "0");
    //     assert(traderPoolTokens24["rewards"].toString() === web3.utils.toWei('1937.5'), traderPoolTokens24["rewards"].toString());//because we don't withdraw groy
    //     assert(traderPoolTokens24["totalRewards"].toString() === web3.utils.toWei('1937.5'));

    //     assert(stakedBalance24.toString() === web3.utils.toWei('0'));
    //     assert(stakeholder24.toString() === trader2);
    //     assert(percentageOfPool24.toString() === "0", percentageOfPool24.toString());

    //     //assert balances
    // });

    // it('Test 14: Player 1 and 2 deposit in the first part of first round, player 2 withdraws at end', async () => {
    //     const amount = web3.utils.toWei('1');
    //     const withdrawAmount = web3.utils.toWei('0.95');
    //     await increaseTime(1);

    //     await pool.stake(//beginning of first cycle
    //         amount,
    //         {from: trader1}
    //     );

    //     await pool.stake(//beginning of first cycle
    //         amount,
    //         {from: trader2}
    //     );

    //     await increaseTime(122); //game over
    //     await pool.withdraw(
    //         withdrawAmount,
    //         {from: trader2}
    //     );

    //     // const currentCycle = await pool.currentCycle();
    //     // console.log(currentCycle.toString())
    //     // const totalDistributions = await pool.totalDistributions();
    //     // console.log(totalDistributions.toString())

    //     // const theCyclesSinceLastDistribution = await pool.theCyclesSinceLastDistribution();
    //     // console.log(theCyclesSinceLastDistribution.toString())

    //     const traderPoolTokens = await pool.stakers(trader1);
    //     const stakeholder1 = await pool.stakeHolders.call(0);
    //     const stakedBalance = await pool.stakedBalances.call(trader1);
    //     const percentageOfPool = await pool.percentageOfPool.call(trader1)

    //     assert(traderPoolTokens["cycleJoined"].toString() === "1");
    //     assert(traderPoolTokens["numberOfDeposits"].toString() === "1");
    //     assert(traderPoolTokens["poolTokens"].toString() === "1000", "number of pooltokens for trader1 should be 1000 "+ traderPoolTokens["poolTokens"]);
    //     assert(traderPoolTokens["pendingTokens"].toString() === "0");
    //     assert(traderPoolTokens["rewards"].toString() === web3.utils.toWei('2500'), "expect 2500 "+traderPoolTokens["rewards"].toString());
    //     assert(traderPoolTokens["totalRewards"].toString() === web3.utils.toWei('2500'), traderPoolTokens["totalRewards"].toString());

    //     assert(stakedBalance.toString() === web3.utils.toWei('0.99875'), "what is this? " + stakedBalance.toString() + web3.utils.toWei('0.99875'));
    //     assert(stakeholder1.toString() === trader1);
    //     assert(percentageOfPool.toString() === "10000", percentageOfPool.toString());

    //     const traderPoolTokens2 = await pool.stakers(trader2);
    //     const stakeholder2 = await pool.stakeHolders.call(1);
    //     const stakedBalance2 = await pool.stakedBalances.call(trader2);
    //     const percentageOfPool2 = await pool.percentageOfPool.call(trader2)

    //     assert(traderPoolTokens2["cycleJoined"].toString() === "1");
    //     assert(traderPoolTokens2["numberOfDeposits"].toString() === "1");
    //     assert(traderPoolTokens2["poolTokens"].toString() === "0", "number of pooltokens for trader1 should be 0 "+ traderPoolTokens["poolTokens"]);
    //     assert(traderPoolTokens2["pendingTokens"].toString() === "0");
    //     assert(traderPoolTokens2["rewards"].toString() === web3.utils.toWei('2500'), traderPoolTokens2["rewards"].toString());
    //     assert(traderPoolTokens2["totalRewards"].toString() === web3.utils.toWei('2500'), traderPoolTokens2["totalRewards"].toString());

    //     assert(stakedBalance2.toString() === web3.utils.toWei('0'));
    //     assert(stakeholder2.toString() === trader2);
    //     assert(percentageOfPool2.toString() === "0", percentageOfPool2.toString());

    //     const t1balance = await crypt.balanceOf.call(trader1)
    //     assert(t1balance.toString() === web3.utils.toWei('999'));
    //     const t2balance = await crypt.balanceOf.call(trader2)
    //     assert(t2balance.toString() === web3.utils.toWei('999.9025'), t2balance.toString());//TODO: Check this to ensure

    // });

    // it('Test 15: Player 1 and 2 deposit in the first part of second round, player 2 withdraws at end', async () => {
    //     const amount = web3.utils.toWei('1');
    //     const withdrawAmount = web3.utils.toWei('.95');
    //     await increaseTime(31);

    //     await pool.stake(//beginning of 2nd cycle
    //         amount,
    //         {from: trader1}
    //     );

    //     await pool.stake(//beginning of 2nd cycle
    //         amount,
    //         {from: trader2}
    //     );

    //     await increaseTime(122); //game over
    //     await pool.withdraw(
    //         withdrawAmount,
    //         {from: trader2}
    //     );
    //     const wholePool = await pool.totalPoolTokens.call();
    //     // console.log(wholePool.toString(),"POOOOOOL");

    //     // const currentCycle = await pool.currentCycle();
    //     // console.log(currentCycle.toString())
    //     // const totalDistributions = await pool.totalDistributions();
    //     // console.log(totalDistributions.toString())

    //     // const theCyclesSinceLastDistribution = await pool.theCyclesSinceLastDistribution();
    //     // console.log(theCyclesSinceLastDistribution.toString())
    //     // const wholePool = await pool.totalPoolTokens.call();
    //     // console.log(wholePool,"POOOOOOL");

    //     const traderPoolTokens = await pool.stakers(trader1);
    //     const stakeholder1 = await pool.stakeHolders.call(0);
    //     const stakedBalance = await pool.stakedBalances.call(trader1);
    //     const percentageOfPool = await pool.percentageOfPool.call(trader1)

    //     const currentCycle = await pool.currentCycle.call()
    //     const cs = currentCycle.toString()
    //     // const lastDistributedCycle = await pool.lastDistributedCycle.call()
    //     // const ldc = lastDistributedCycle.toString()
    //     const totalDistributions = await pool.totalDistributions.call()
    //     const td = totalDistributions.toString()

    //     assert(traderPoolTokens["cycleJoined"].toString() === "2");
    //     assert(traderPoolTokens["numberOfDeposits"].toString() === "1");
    //     assert(traderPoolTokens["poolTokens"].toString() === "1000", "number of pooltokens for trader1 should be 1000 "+ traderPoolTokens["poolTokens"]);
    //     assert(traderPoolTokens["pendingTokens"].toString() === "0");
    //     assert(traderPoolTokens["rewards"].toString() === web3.utils.toWei('2500'), "expect 2500 "+traderPoolTokens["rewards"].toString());
    //     assert(traderPoolTokens["totalRewards"].toString() === web3.utils.toWei('2500'), traderPoolTokens["totalRewards"].toString());

    //     assert(stakedBalance.toString() === web3.utils.toWei('.99875'), stakedBalance.toString());//(.05+0.0475)/2=0.04875+.95
    //     assert(stakeholder1.toString() === trader1);
    //     assert(percentageOfPool.toString() === "10000", percentageOfPool.toString());

    //     const traderPoolTokens2 = await pool.stakers(trader2);
    //     const stakeholder2 = await pool.stakeHolders.call(1);
    //     const stakedBalance2 = await pool.stakedBalances.call(trader2);
    //     const percentageOfPool2 = await pool.percentageOfPool.call(trader2)

    //     assert(traderPoolTokens2["cycleJoined"].toString() === "2");
    //     assert(traderPoolTokens2["numberOfDeposits"].toString() === "1");
    //     assert(traderPoolTokens2["poolTokens"].toString() === "0", "number of pooltokens for trader1 should be 0 "+ traderPoolTokens["poolTokens"]);
    //     assert(traderPoolTokens2["pendingTokens"].toString() === "0");
    //     assert(traderPoolTokens2["rewards"].toString() === web3.utils.toWei('2500'));
    //     assert(traderPoolTokens2["totalRewards"].toString() === web3.utils.toWei('2500'), traderPoolTokens2["totalRewards"].toString());

    //     assert(stakedBalance2.toString() === web3.utils.toWei('0'));
    //     assert(stakeholder2.toString() === trader2);
    //     assert(percentageOfPool2.toString() === "0", percentageOfPool2.toString());

    //     const t1balance = await crypt.balanceOf.call(trader1)
    //     assert(t1balance.toString() === web3.utils.toWei('999'));
    //     const t2balance = await crypt.balanceOf.call(trader2)
    //     // assert(t2balance.toString() === web3.utils.toWei('3500'), t2balance.toString()); //TODO: what? 999950000000000000000


    // });

    // it('Test 16: Player 1 and 2 deposit in the first part of 3rd round, player 2 withdraws at end', async () => {
    //     const amount = web3.utils.toWei('1');
    //     const withdrawAmount = web3.utils.toWei('.95');
    //     await increaseTime(61);

    //     await pool.stake(//beginning of 3rd cycle
    //         amount,
    //         {from: trader1}
    //     );

    //     await pool.stake(//beginning of 3rd cycle
    //         amount,
    //         {from: trader2}
    //     );

    //     await increaseTime(1220); //game over
    //     await pool.withdraw(
    //         withdrawAmount,
    //         {from: trader2}
    //     );

    //     // const currentCycle = await pool.currentCycle();
    //     // console.log(currentCycle.toString())
    //     // const totalDistributions = await pool.totalDistributions();
    //     // console.log(totalDistributions.toString())

    //     // const theCyclesSinceLastDistribution = await pool.theCyclesSinceLastDistribution();
    //     // console.log(theCyclesSinceLastDistribution.toString())

    //     const traderPoolTokens = await pool.stakers(trader1);
    //     const stakeholder1 = await pool.stakeHolders.call(0);
    //     const stakedBalance = await pool.stakedBalances.call(trader1);
    //     const percentageOfPool = await pool.percentageOfPool.call(trader1)

    //     assert(traderPoolTokens["cycleJoined"].toString() === "3");
    //     assert(traderPoolTokens["numberOfDeposits"].toString() === "1");
    //     assert(traderPoolTokens["poolTokens"].toString() === "1000", "number of pooltokens for trader1 should be 1000 "+ traderPoolTokens["poolTokens"]);
    //     assert(traderPoolTokens["pendingTokens"].toString() === "0");
    //     assert(traderPoolTokens["rewards"].toString() === web3.utils.toWei('2500'), "expect 2500 "+traderPoolTokens["rewards"].toString());
    //     assert(traderPoolTokens["totalRewards"].toString() === web3.utils.toWei('2500'), traderPoolTokens["totalRewards"].toString());

    //     assert(stakedBalance.toString() === web3.utils.toWei('0.99875'), stakedBalance.toString());
    //     assert(stakeholder1.toString() === trader1);
    //     assert(percentageOfPool.toString() === "10000", percentageOfPool.toString());

    //     const traderPoolTokens2 = await pool.stakers(trader2);
    //     const stakeholder2 = await pool.stakeHolders.call(1);
    //     const stakedBalance2 = await pool.stakedBalances.call(trader2);
    //     const percentageOfPool2 = await pool.percentageOfPool.call(trader2)

    //     assert(traderPoolTokens2["cycleJoined"].toString() === "3");
    //     assert(traderPoolTokens2["numberOfDeposits"].toString() === "1");
    //     assert(traderPoolTokens2["poolTokens"].toString() === "0", "number of pooltokens for trader1 should be 0 "+ traderPoolTokens["poolTokens"]);
    //     assert(traderPoolTokens2["pendingTokens"].toString() === "0");
    //     assert(traderPoolTokens2["rewards"].toString() === web3.utils.toWei('2500'));
    //     assert(traderPoolTokens2["totalRewards"].toString() === web3.utils.toWei('2500'), traderPoolTokens2["totalRewards"].toString());

    //     assert(stakedBalance2.toString() === web3.utils.toWei('0'));
    //     assert(stakeholder2.toString() === trader2);
    //     assert(percentageOfPool2.toString() === "0", percentageOfPool2.toString());

    //     const t1balance = await crypt.balanceOf.call(trader1)
    //     assert(t1balance.toString() === web3.utils.toWei('999'), t1balance.toString());
    //     const t2balance = await crypt.balanceOf.call(trader2)
    //     assert(t2balance.toString() === web3.utils.toWei('999.9025'), t2balance.toString());

    // });

    // it('Test 17: Player 1 and 2 deposit in the 2nd part of 3rd round, player 2 withdraws at end', async () => {
    //     // this shows the weird situation where no one uses the pool at all, not even the owner or anyone in any first part of a cycle
    //     // OR someone puts in the last part of the cycle before the last cycle but 0 work is done in the last cycle

    //     const amount = web3.utils.toWei('1');
    //     const withdrawAmount = web3.utils.toWei('.95');
    //     await increaseTime(88);

    //     await pool.stake(//end of 3rd cycle
    //         amount,
    //         {from: trader1}
    //     );

    //     await pool.stake(//end of 3rd cycle
    //         amount,
    //         {from: trader2}
    //     );

    //     await increaseTime(40); //game over

    //     await pool.withdraw(
    //         withdrawAmount,
    //         {from: trader2}
    //     );

    //     // const currentCycle = await pool.currentCycle();
    //     // console.log(currentCycle.toString())
    //     // const totalDistributions = await pool.totalDistributions();
    //     // console.log(totalDistributions.toString())

    //     // const theCyclesSinceLastDistribution = await pool.theCyclesSinceLastDistribution();
    //     // console.log(theCyclesSinceLastDistribution.toString())

    //     const traderPoolTokens = await pool.stakers(trader1);
    //     const stakeholder1 = await pool.stakeHolders.call(0);
    //     const stakedBalance = await pool.stakedBalances.call(trader1);
    //     const percentageOfPool = await pool.percentageOfPool.call(trader1)

    //     assert(traderPoolTokens["cycleJoined"].toString() === "3", "joined at " + traderPoolTokens["cycleJoined"].toString());
    //     assert(traderPoolTokens["numberOfDeposits"].toString() === "1");
    //     assert(traderPoolTokens["poolTokens"].toString() === "1000", "number of pooltokens for trader1 should be 1000 "+ traderPoolTokens["poolTokens"]);
    //     assert(traderPoolTokens["pendingTokens"].toString() === "0");
    //     assert(traderPoolTokens["rewards"].toString() === web3.utils.toWei('2500'), "Definitely should be 2500, both deposited in first round" + traderPoolTokens["rewards"].toString());
    //     assert(traderPoolTokens["totalRewards"].toString() === web3.utils.toWei('2500'), traderPoolTokens["totalRewards"].toString());

    //     assert(stakedBalance.toString() === web3.utils.toWei('.99875'), stakedBalance.toString());
    //     assert(stakeholder1.toString() === trader1);
    //     assert(percentageOfPool.toString() === "10000", percentageOfPool.toString());

    //     const traderPoolTokens2 = await pool.stakers(trader2);
    //     const stakeholder2 = await pool.stakeHolders.call(1);
    //     const stakedBalance2 = await pool.stakedBalances.call(trader2);
    //     const percentageOfPool2 = await pool.percentageOfPool.call(trader2)

    //     assert(traderPoolTokens2["cycleJoined"].toString() === "3", traderPoolTokens2["cycleJoined"].toString());
    //     assert(traderPoolTokens2["numberOfDeposits"].toString() === "1");
    //     assert(traderPoolTokens2["poolTokens"].toString() === "0", "number of pooltokens for trader1 should be 0 "+ traderPoolTokens["poolTokens"]);
    //     assert(traderPoolTokens2["pendingTokens"].toString() === "0");
    //     assert(traderPoolTokens2["rewards"].toString() === web3.utils.toWei('2500'));
    //     assert(traderPoolTokens2["totalRewards"].toString() === web3.utils.toWei('2500'), traderPoolTokens2["totalRewards"].toString());

    //     assert(stakedBalance2.toString() === web3.utils.toWei('0'));
    //     assert(stakeholder2.toString() === trader2);
    //     assert(percentageOfPool2.toString() === "0", percentageOfPool2.toString());

    //     const t1balance = await crypt.balanceOf.call(trader1)
    //     assert(t1balance.toString() === web3.utils.toWei('999'), t1balance.toString());
    //     const t2balance = await crypt.balanceOf.call(trader2)
    //     assert(t2balance.toString() === web3.utils.toWei('999.9025'), t2balance.toString());

    // });

    // it('Test 18: Player 1 and 2 deposit in the 2nd part of 3rd round, player 2 withdraws at end', async () => {
    //     // this shows the weird situation where no one uses the pool at all, not even the owner or anyone in any first part of a cycle
    //     // OR someone puts in the last part of the cycle before the last cycle but 0 work is done in the last cycle

    //     const amount = web3.utils.toWei('1');
    //     const withdrawAmount = web3.utils.toWei('.95');
    //     await increaseTime(88);

    //     await pool.stake(//end of 3rd cycle
    //         amount,
    //         {from: trader1}
    //     );

    //     await pool.stake(//end of 3rd cycle
    //         amount,
    //         {from: trader2}
    //     );

    //     await increaseTime(40); //game over

    //     await pool.withdraw(
    //         withdrawAmount,
    //         {from: trader2}
    //     );

    //     // const currentCycle = await pool.currentCycle();
    //     // console.log(currentCycle.toString())
    //     // const totalDistributions = await pool.totalDistributions();
    //     // console.log(totalDistributions.toString())

    //     // const theCyclesSinceLastDistribution = await pool.theCyclesSinceLastDistribution();
    //     // console.log(theCyclesSinceLastDistribution.toString())

    //     const traderPoolTokens = await pool.stakers(trader1);
    //     const stakeholder1 = await pool.stakeHolders.call(0);
    //     const stakedBalance = await pool.stakedBalances.call(trader1);
    //     const percentageOfPool = await pool.percentageOfPool.call(trader1)

    //     assert(traderPoolTokens["cycleJoined"].toString() === "3");
    //     assert(traderPoolTokens["numberOfDeposits"].toString() === "1");
    //     assert(traderPoolTokens["poolTokens"].toString() === "1000", "number of pooltokens for trader1 should be 1000 "+ traderPoolTokens["poolTokens"]);
    //     assert(traderPoolTokens["pendingTokens"].toString() === "0");
    //     assert(traderPoolTokens["rewards"].toString() === web3.utils.toWei('2500'), traderPoolTokens["rewards"].toString());
    //     assert(traderPoolTokens["totalRewards"].toString() === web3.utils.toWei('2500'), traderPoolTokens["totalRewards"].toString());

    //     assert(stakedBalance.toString() === web3.utils.toWei('0.99875'), stakedBalance.toString());
    //     assert(stakeholder1.toString() === trader1);
    //     assert(percentageOfPool.toString() === "10000", percentageOfPool.toString());

    //     const traderPoolTokens2 = await pool.stakers(trader2);
    //     const stakeholder2 = await pool.stakeHolders.call(1);
    //     const stakedBalance2 = await pool.stakedBalances.call(trader2);
    //     const percentageOfPool2 = await pool.percentageOfPool.call(trader2)

    //     assert(traderPoolTokens2["cycleJoined"].toString() === "3");
    //     assert(traderPoolTokens2["numberOfDeposits"].toString() === "1");
    //     assert(traderPoolTokens2["poolTokens"].toString() === "0", "number of pooltokens for trader1 should be 0 "+ traderPoolTokens["poolTokens"]);
    //     assert(traderPoolTokens2["pendingTokens"].toString() === "0");
    //     assert(traderPoolTokens2["rewards"].toString() === web3.utils.toWei('2500'));
    //     assert(traderPoolTokens2["totalRewards"].toString() === web3.utils.toWei('2500'), traderPoolTokens2["totalRewards"].toString());

    //     assert(stakedBalance2.toString() === web3.utils.toWei('0'));
    //     assert(stakeholder2.toString() === trader2);
    //     assert(percentageOfPool2.toString() === "0", percentageOfPool2.toString());

    //     const t1balance = await crypt.balanceOf.call(trader1)
    //     assert(t1balance.toString() === web3.utils.toWei('999'));
    //     const t2balance = await crypt.balanceOf.call(trader2)
    //     assert(t2balance.toString() === web3.utils.toWei('999.9025'), t2balance.toString());

    // });

    // it('Test 19: Player 1 and 2 deposit in the 2nd part of 3rd round, player 1 withdraws at end, or two tried that too', async () => {
    //     // this shows the alternate scenario of previous bug but in this case we want to make sure we don't reward TWICE to anyone, even though the rewards we gave out are too much :(
    //     // we could add "round rewards in the beginning and subtract from it each time then pick up from that"
    //     // OR someone puts in the last part of the cycle before the last cycle but 0 work is done in the last cycle

    //     const amount = web3.utils.toWei('1');
    //     const amount2 = web3.utils.toWei('2');
    //     const withdrawAmount2 = web3.utils.toWei('1.95');
    //     await increaseTime(1);
    //     await pool.stake(//beginning of 1st cycle
    //         amount,
    //         {from: trader1}
    //     );

    //     await increaseTime(87); //end of 3rd cycle

    //     await pool.stake(//end of 3rd cycle
    //         amount,
    //         {from: trader1}
    //     ); // with new logic this will make player 1 get rewarded twice at the end which WE DO NOT WANT

    //     await pool.stake(//end of 3rd cycle
    //         amount2,// 50% is easier to calculate than 33%
    //         {from: trader2}
    //     );


    //     const traderPoolTokens = await pool.stakers(trader1);
    //     const stakeholder1 = await pool.stakeHolders.call(0);
    //     const stakedBalance = await pool.stakedBalances.call(trader1);
    //     const percentageOfPool = await pool.percentageOfPool.call(trader1)

    //     assert(traderPoolTokens["cycleJoined"].toString() === "1");
    //     assert(traderPoolTokens["numberOfDeposits"].toString() === "2");
    //     assert(traderPoolTokens["poolTokens"].toString() === "1000", "number of pooltokens for trader1 should be 1000 "+ traderPoolTokens["poolTokens"]);
    //     assert(traderPoolTokens["pendingTokens"].toString() === "1000");
    //     assert(traderPoolTokens["rewards"].toString() === web3.utils.toWei('2500'), traderPoolTokens["rewards"].toString());
    //     assert(traderPoolTokens["totalRewards"].toString() === web3.utils.toWei('2500'), traderPoolTokens["totalRewards"].toString());

    //     assert(stakedBalance.toString() === web3.utils.toWei('1.95'), stakedBalance.toString());
    //     assert(stakeholder1.toString() === trader1);
    //     assert(percentageOfPool.toString() === "10000", percentageOfPool.toString()); // 100 cuz all rest are pending

    //     const traderPoolTokens2 = await pool.stakers(trader2);
    //     const stakeholder2 = await pool.stakeHolders.call(1);
    //     const stakedBalance2 = await pool.stakedBalances.call(trader2);
    //     const percentageOfPool2 = await pool.percentageOfPool.call(trader2)

    //     assert(traderPoolTokens2["cycleJoined"].toString() === "3");
    //     assert(traderPoolTokens2["numberOfDeposits"].toString() === "1");
    //     assert(traderPoolTokens2["poolTokens"].toString() === "0", "number of pooltokens for trader1 should be 0 "+ traderPoolTokens["poolTokens"]);
    //     assert(traderPoolTokens2["pendingTokens"].toString() === "2000");
    //     assert(traderPoolTokens2["rewards"].toString() === web3.utils.toWei('0'));
    //     assert(traderPoolTokens2["totalRewards"].toString() === web3.utils.toWei('0'), traderPoolTokens2["totalRewards"].toString());

    //     assert(stakedBalance2.toString() === web3.utils.toWei('1.9'), stakedBalance2.toString());
    //     assert(stakeholder2.toString() === trader2);
    //     assert(percentageOfPool2.toString() === "0", percentageOfPool2.toString());

    //     await increaseTime(40);//game over

    //     await pool.withdraw(//1 less reward cycle and this would work
    //         withdrawAmount2,
    //         {from: trader1}
    //     );

    //     // await pool.checkTheShit();

    //     // const rpt = await pool.getCycleRewardsPerToken()
    //     // const rpts = rpt.toString()
    //     // console.log("rewards per pool token " + rpts)
    //     // const numberOfStakeholders2 = await pool.stakeHolders.call(2);

    //     // const currentCycle = await pool.currentCycle();
    //     // console.log(currentCycle.toString())
    //     // const totalDistributions = await pool.totalDistributions();
    //     // console.log(totalDistributions.toString())

    //     // const lastDistributedCycle = await pool.lastDistributedCycle();
    //     // console.log("last cycle " + lastDistributedCycle.toString())

    //     const traderPoolTokens1 = await pool.stakers(trader1);
    //     const stakeholder11 = await pool.stakeHolders.call(0);
    //     const stakedBalance1 = await pool.stakedBalances.call(trader1);
    //     const percentageOfPool1 = await pool.percentageOfPool.call(trader1)
    //     // console.log(traderPoolTokens1["cycleJoined"].toString())
    //     // console.log(traderPoolTokens1["numberOfDeposits"].toString())
    //     // console.log(traderPoolTokens1["poolTokens"].toString())
    //     // console.log(traderPoolTokens1["pendingTokens"].toString())
    //     // console.log(traderPoolTokens1["rewards"].toString())
    //     // console.log(traderPoolTokens1["totalRewards"].toString())
    //     const traderPoolTokens222 = await pool.stakers(trader2);
    //     // console.log(traderPoolTokens222["cycleJoined"].toString())
    //     // console.log(traderPoolTokens222["numberOfDeposits"].toString())
    //     // console.log(traderPoolTokens222["poolTokens"].toString())
    //     // console.log(traderPoolTokens222["pendingTokens"].toString())
    //     // console.log(traderPoolTokens222["rewards"].toString())
    //     // console.log(traderPoolTokens222["totalRewards"].toString())

    //     // assert(traderPoolTokens1["cycleJoined"].toString() === "1");
    //     // assert(traderPoolTokens1["numberOfDeposits"].toString() === "2");
    //     // assert(traderPoolTokens1["poolTokens"].toString() === "0", "number of pooltokens for trader1 should be 0 "+ traderPoolTokens1["poolTokens"]);
    //     // assert(traderPoolTokens1["pendingTokens"].toString() === "0");
    //     // assert(traderPoolTokens1["rewards"].toString() === web3.utils.toWei('0'), traderPoolTokens1["rewards"].toString());
    //     // assert(traderPoolTokens1["totalRewards"].toString() === web3.utils.toWei('4375'), traderPoolTokens1["totalRewards"].toString());

    //     // assert(stakedBalance1.toString() === web3.utils.toWei('0'));
    //     assert(stakeholder11.toString() === trader1);
    //     const totalPoolTokens = await pool.totalPoolTokens();
    //     // console.log(totalPoolTokens.toString())

    //     // console.log(traderPoolTokens1["poolTokens"].toString())
    //     // assert(percentageOfPool1.toString() === "0", percentageOfPool1.toString());

    //     const traderPoolTokens22 = await pool.stakers(trader2);
    //     const stakeholder22 = await pool.stakeHolders.call(1);
    //     const stakedBalance22 = await pool.stakedBalances.call(trader2);
    //     const percentageOfPool22 = await pool.percentageOfPool.call(trader2)
    //     // console.log(traderPoolTokens22["totalRewards"].toString())
    //     const rpt = await pool.getCycleRewardsPerToken()
    //     const rpts = rpt.toString()
    //     // console.log("rewards per pool token " + rpts)

    //     // const tv = await pool.tempValue();
    //     // const tvs = tv.toString()
    //     // console.log("cyclesToReward " + tvs)
    //     // const cyclesSinceLastDistribution = await pool.cyclesSinceLastDistribution();//not a thing
    //     // console.log("cycles since last distribution " + cyclesSinceLastDistribution.toString())
    //     assert(traderPoolTokens22["cycleJoined"].toString() === "3");
    //     assert(traderPoolTokens22["numberOfDeposits"].toString() === "1");
    //     assert(traderPoolTokens22["poolTokens"].toString() === "2000", "number of pooltokens for trader1 should be 2000 "+ traderPoolTokens["poolTokens"]);
    //     assert(traderPoolTokens22["pendingTokens"].toString() === "0");
    //     assert(traderPoolTokens22["rewards"].toString() === web3.utils.toWei('625'), traderPoolTokens22["rewards"].toString());
    //     assert(traderPoolTokens22["totalRewards"].toString() === web3.utils.toWei('625'), "this should be 625 because this trader was only in the 4th cycle " + traderPoolTokens22["totalRewards"].toString());//1875000000000000000000 right now, should be half of 1250

    //     assert(stakedBalance22.toString() === web3.utils.toWei('1.94875'), stakedBalance22.toString());
    //     assert(stakeholder22.toString() === trader2);
    //     assert(percentageOfPool22.toString() === "10000", percentageOfPool2.toString());

    //     // const t1balance = await crypt.balanceOf.call(trader1)
    //     // assert(t1balance.toString() === web3.utils.toWei('999'));
    //     // const t2balance = await crypt.balanceOf.call(trader2)
    //     // assert(t2balance.toString() === web3.utils.toWei('3500'));

    // });

    // it('Test 20: Player 1 and 2 deposit in the 2nd part of 3rd round, player 2 withdraws way in the future', async () => {
    //     // this shows the weird situation where no one uses the pool at all, not even the owner or anyone in any first part of a cycle
    //     // OR someone puts in the last part of the cycle before the last cycle but 0 work is done in the last cycle

    //     const amount = web3.utils.toWei('1');
    //     const withdrawAmount = web3.utils.toWei('0.95');
    //     await increaseTime(88);

    //     await pool.stake(//end of 3rd cycle
    //         amount,
    //         {from: trader1}
    //     );

    //     await pool.stake(//end of 3rd cycle
    //         amount,
    //         {from: trader2}
    //     );

    //     await increaseTime(4000); //game over

    //     await pool.withdraw(
    //         withdrawAmount,
    //         {from: trader2}
    //     );// this scenario 0,1 have 1000 pending tokens at end of 3rd cycle, last distribution is 0, afterwards they should have 4*50% of pool

    //     // const currentCycle = await pool.currentCycle();
    //     // console.log(currentCycle.toString())
    //     // const totalDistributions = await pool.totalDistributions();
    //     // console.log(totalDistributions.toString())

    //     // const theCyclesSinceLastDistribution = await pool.theCyclesSinceLastDistribution();
    //     // console.log(theCyclesSinceLastDistribution.toString())

    //     const traderPoolTokens = await pool.stakers(trader1);
    //     const stakeholder1 = await pool.stakeHolders.call(0);
    //     const stakedBalance = await pool.stakedBalances.call(trader1);
    //     const percentageOfPool = await pool.percentageOfPool.call(trader1)

    //     assert(traderPoolTokens["cycleJoined"].toString() === "3");
    //     assert(traderPoolTokens["numberOfDeposits"].toString() === "1");
    //     assert(traderPoolTokens["poolTokens"].toString() === "1000", "number of pooltokens for trader1 should be 1000 "+ traderPoolTokens["poolTokens"]);
    //     assert(traderPoolTokens["pendingTokens"].toString() === "0");
    //     assert(traderPoolTokens["rewards"].toString() === web3.utils.toWei('2500'), traderPoolTokens["rewards"].toString());
    //     assert(traderPoolTokens["totalRewards"].toString() === web3.utils.toWei('2500'), traderPoolTokens["totalRewards"].toString());

    //     assert(stakedBalance.toString() === web3.utils.toWei('0.99875'), stakedBalance.toString());
    //     assert(stakeholder1.toString() === trader1);
    //     assert(percentageOfPool.toString() === "10000", percentageOfPool.toString());

    //     const traderPoolTokens2 = await pool.stakers(trader2);
    //     const stakeholder2 = await pool.stakeHolders.call(1);
    //     const stakedBalance2 = await pool.stakedBalances.call(trader2);
    //     const percentageOfPool2 = await pool.percentageOfPool.call(trader2)

    //     assert(traderPoolTokens2["cycleJoined"].toString() === "3");
    //     assert(traderPoolTokens2["numberOfDeposits"].toString() === "1");
    //     assert(traderPoolTokens2["poolTokens"].toString() === "0", "number of pooltokens for trader1 should be 0 "+ traderPoolTokens["poolTokens"]);
    //     assert(traderPoolTokens2["pendingTokens"].toString() === "0");
    //     assert(traderPoolTokens2["rewards"].toString() === web3.utils.toWei('2500'));
    //     assert(traderPoolTokens2["totalRewards"].toString() === web3.utils.toWei('2500'), traderPoolTokens2["totalRewards"].toString());

    //     assert(stakedBalance2.toString() === web3.utils.toWei('0'));
    //     assert(stakeholder2.toString() === trader2);
    //     assert(percentageOfPool2.toString() === "0", percentageOfPool2.toString());

    //     const t1balance = await crypt.balanceOf.call(trader1)
    //     assert(t1balance.toString() === web3.utils.toWei('999'), t1balance.toString());
    //     const t2balance = await crypt.balanceOf.call(trader2)
    //     assert(t2balance.toString() === web3.utils.toWei('999.9025'), t2balance.toString());

    // });

    // it('Test 21: Player 1 and 2 deposit in the first part of 4th round, player 2 withdraws at end', async () => {
    //     const amount = web3.utils.toWei('1');
    //     const withdrawAmount = web3.utils.toWei('0.95');
    //     await increaseTime(91);

    //     await pool.stake(//beginning of 4th cycle
    //         amount,
    //         { from: trader1 }
    //     );

    //     await pool.stake(//beginning of 4th cycle
    //         amount,
    //         { from: trader2 }
    //     );

    //     // await pool.stake(//beginning of 4th cycle
    //     //     amount,
    //     //     {from: trader3}
    //     // );

    //     // await pool.stake(//beginning of 4th cycle
    //     //     amount,
    //     //     { from: trader4 }
    //     // );

    //     await increaseTime(1202); //game over
    //     await pool.withdraw(
    //         withdrawAmount,
    //         { from: trader2 }
    //     );

    //     // const currentCycle = await pool.currentCycle();
    //     // console.log(currentCycle.toString())
    //     // const totalDistributions = await pool.totalDistributions();
    //     // console.log(totalDistributions.toString())

    //     // const theCyclesSinceLastDistribution = await pool.theCyclesSinceLastDistribution();
    //     // console.log(theCyclesSinceLastDistribution.toString())

    //     const traderPoolTokens = await pool.stakers(trader1);
    //     const stakeholder1 = await pool.stakeHolders.call(0);
    //     const stakedBalance = await pool.stakedBalances.call(trader1);
    //     const percentageOfPool = await pool.percentageOfPool.call(trader1)
    //     // const stakeholder3 = await pool.stakeHolders.call(2);

    //     assert(traderPoolTokens["cycleJoined"].toString() === "4");
    //     assert(traderPoolTokens["numberOfDeposits"].toString() === "1");
    //     assert(traderPoolTokens["poolTokens"].toString() === "1000", "number of pooltokens for trader1 should be 1000 " + traderPoolTokens["poolTokens"]);
    //     assert(traderPoolTokens["pendingTokens"].toString() === "0");
    //     assert(traderPoolTokens["rewards"].toString() === web3.utils.toWei('2500'), "expect 2500 " + traderPoolTokens["rewards"].toString());
    //     assert(traderPoolTokens["totalRewards"].toString() === web3.utils.toWei('2500'), traderPoolTokens["totalRewards"].toString());

    //     assert(stakedBalance.toString() === web3.utils.toWei('0.99875'), stakedBalance.toString());
    //     assert(stakeholder1.toString() === trader1);
    //     assert(percentageOfPool.toString() === "10000", percentageOfPool.toString());

    //     const traderPoolTokens2 = await pool.stakers(trader2);
    //     const stakeholder2 = await pool.stakeHolders.call(1);
    //     const stakedBalance2 = await pool.stakedBalances.call(trader2);
    //     const percentageOfPool2 = await pool.percentageOfPool.call(trader2)

    //     assert(traderPoolTokens2["cycleJoined"].toString() === "4");
    //     assert(traderPoolTokens2["numberOfDeposits"].toString() === "1");
    //     assert(traderPoolTokens2["poolTokens"].toString() === "0", "number of pooltokens for trader1 should be 0 " + traderPoolTokens["poolTokens"]);
    //     assert(traderPoolTokens2["pendingTokens"].toString() === "0");
    //     assert(traderPoolTokens2["rewards"].toString() === web3.utils.toWei('2500'));
    //     assert(traderPoolTokens2["totalRewards"].toString() === web3.utils.toWei('2500'), traderPoolTokens2["totalRewards"].toString());

    //     assert(stakedBalance2.toString() === web3.utils.toWei('0'));
    //     assert(stakeholder2.toString() === trader2);
    //     assert(percentageOfPool2.toString() === "0", percentageOfPool2.toString());

    //     const t1balance = await crypt.balanceOf.call(trader1)
    //     assert(t1balance.toString() === web3.utils.toWei('999'), t1balance.toString());
    //     const t2balance = await crypt.balanceOf.call(trader2)
    //     assert(t2balance.toString() === web3.utils.toWei('999.9025'), t2balance.toString());

    // });

    // it('Test 22: Players 1-4 deposit in first round, p1/2 deposits in 4th round, player 2 withdraws at end', async () => {
    //     const amount = web3.utils.toWei('1');
    //     const amount2 = web3.utils.toWei('2');
    //     await increaseTime(1);

    //     await pool.stake(//beginning of 1st cycle
    //         amount,
    //         { from: trader1 }
    //     );
    //     await pool.stake(//beginning of 1st cycle
    //         amount,
    //         { from: trader2 }
    //     );
    //     await pool.stake(//beginning of 1st cycle
    //         amount,
    //         { from: trader3 }
    //     );
    //     await pool.stake(//beginning of 1st cycle
    //         amount,
    //         { from: trader4 }
    //     );

    //     await increaseTime(91);

    //     await pool.stake(//beginning of 4th cycle
    //         amount,
    //         { from: trader1 }
    //     );

    //     const traderPoolTokens41 = await pool.stakers(trader1);
    //     const stakeholder41 = await pool.stakeHolders.call(0);
    //     const stakedBalance41 = await pool.stakedBalances.call(trader1);
    //     const percentageOfPool41 = await pool.percentageOfPool.call(trader1)

    //     assert(traderPoolTokens41["cycleJoined"].toString() === "1");
    //     assert(traderPoolTokens41["numberOfDeposits"].toString() === "2");
    //     assert(traderPoolTokens41["poolTokens"].toString() === "2000", "number of pooltokens for trader1 should be 1000 " + traderPoolTokens41["poolTokens"]);
    //     assert(traderPoolTokens41["pendingTokens"].toString() === "0");
    //     assert(traderPoolTokens41["rewards"].toString() === web3.utils.toWei('937.5'), "expect 937.5 " + traderPoolTokens41["rewards"].toString());
    //     assert(traderPoolTokens41["totalRewards"].toString() === web3.utils.toWei('937.5'), traderPoolTokens41["totalRewards"].toString());

    //     assert(stakedBalance41.toString() === "1945833333333333000", stakedBalance41.toString());//TODO: check the math on this
    //     assert(stakeholder41.toString() === trader1);
    //     assert(percentageOfPool41.toString() === "4000", percentageOfPool41.toString());

    //     await pool.stake(//beginning of 4th cycle
    //         amount,
    //         { from: trader2 }
    //     );

    //     const stakedBalanceNumberTwo = await pool.stakedBalances.call(trader2);
    //     assert(stakedBalanceNumberTwo.toString() === "1929166666666666000", stakedBalanceNumberTwo.toString());//TODO: check the math on this

    //     await increaseTime(1202); //game over
    //     await pool.withdraw(
    //         "1929166666666666000",
    //         { from: trader2 }
    //     );

    //     const traderPoolTokens44 = await pool.stakers(trader4);
    //     const stakeholder44 = await pool.stakeHolders.call(3);
    //     const stakedBalance44 = await pool.stakedBalances.call(trader4);
    //     const percentageOfPool44 = await pool.percentageOfPool.call(trader4)
    //     // const stakeholder3 = await pool.stakeHolders.call(2);

    //     assert(traderPoolTokens44["cycleJoined"].toString() === "1");
    //     assert(traderPoolTokens44["numberOfDeposits"].toString() === "1");
    //     assert(traderPoolTokens44["poolTokens"].toString() === "1000", "number of pooltokens for trader4 should be 1000 " + traderPoolTokens44["poolTokens"]);
    //     assert(traderPoolTokens44["pendingTokens"].toString() === "0");
    //     assert(traderPoolTokens44["rewards"].toString() === "1145833333333333333000", "expect 1145833333333333333000 " + traderPoolTokens44["rewards"].toString());
    //     assert(traderPoolTokens44["totalRewards"].toString() === "1145833333333333333000", traderPoolTokens44["totalRewards"].toString());

    //     assert(stakedBalance44.toString() === "976640624999999000", stakedBalance44.toString());
    //     assert(stakeholder44.toString() === trader4);
    //     assert(percentageOfPool44.toString() === "2500", percentageOfPool44.toString());

    //     const traderPoolTokens42 = await pool.stakers(trader2);
    //     const stakeholder42 = await pool.stakeHolders.call(1);
    //     const stakedBalance42 = await pool.stakedBalances.call(trader2);
    //     const percentageOfPool42 = await pool.percentageOfPool.call(trader2)

    //     assert(traderPoolTokens42["cycleJoined"].toString() === "1");
    //     assert(traderPoolTokens42["numberOfDeposits"].toString() === "2");
    //     assert(traderPoolTokens42["poolTokens"].toString() === "0", "number of pooltokens for trader2 should be 0 " + traderPoolTokens42["poolTokens"]);
    //     assert(traderPoolTokens42["pendingTokens"].toString() === "0");
    //     assert(traderPoolTokens42["rewards"].toString() === "1354166666666666666000");
    //     assert(traderPoolTokens42["totalRewards"].toString() === "1354166666666666666000", traderPoolTokens42["totalRewards"].toString());

    //     assert(stakedBalance42.toString() === web3.utils.toWei('0'));
    //     assert(stakeholder42.toString() === trader2);
    //     assert(percentageOfPool42.toString() === "0", percentageOfPool42.toString());

    //     const t1balance = await crypt.balanceOf.call(trader1)
    //     assert(t1balance.toString() === web3.utils.toWei('998'), t1balance.toString());
    //     const t2balance = await crypt.balanceOf.call(trader2)
    //     assert(t2balance.toString() === "999832708333333332700", t2balance.toString()); //TODO: Rewards separate

    //     const stakedBalanceNumberOne = await pool.stakedBalances.call(trader1);
    //     assert(stakedBalanceNumberOne.toString() === "1982447916666665000", stakedBalanceNumberOne.toString());//TODO: check the math on this

    //     await pool.withdraw(//beginning of 1st cycle
    //         "1982447916666665000",
    //         { from: trader1 }
    //     );
    //     // await pool.withdraw(//beginning of 1st cycle
    //     //     amount,
    //     //     { from: trader1 }
    //     // );

    //     const stakedBalanceNumberThree = await pool.stakedBalances.call(trader3);
    //     assert(stakedBalanceNumberThree.toString() === "1009754557291665000", stakedBalanceNumberThree.toString());//TODO: check the math on this

    //     await pool.withdraw(//beginning of 1st cycle
    //         "1009754557291665000",
    //         { from: trader3 }
    //     );
    //     const stakedBalanceNumberFour = await pool.stakedBalances.call(trader4);
    //     assert(stakedBalanceNumberFour.toString() === "1026665087890623000", stakedBalanceNumberFour.toString());//TODO: check the math on this
    //     await pool.withdraw(//beginning of 1st cycle
    //         "1026665087890623000",
    //         { from: trader4 }
    //     );
    // });
    // try four in first round
    // try four in each round
    // try four in each round with two continuously adding funds each round
    // try four in each round with two continuously adding funds each round and in every half of each round

});

// const { expectRevert } = require('@openzeppelin/test-helpers');
// await expectRevert(doAthing in here)