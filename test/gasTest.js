const { expectRevert } = require('@openzeppelin/test-helpers');
const Crypt = artifacts.require('mocks/crypt.sol');
const PoolOne = artifacts.require('PoolOne.sol');

var pool;

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

  it('Test 1: should 50 user stake', async () => {
    await increaseTime(1);
    const amount = web3.utils.toWei('0.01');
    let i=0;
    while (i<50) {
      await pool.stake(
        amount,
        {from: trader2}
      );
      i++;
    }
    const amountOfGas = await pool.stake.estimateGas(amount, {from: trader3});
    console.log('gas amount: ', amountOfGas);
  });

  it('Test 2: should 100 user stake', async () => {
    await increaseTime(1);
    const amount = web3.utils.toWei('0.01');
    await pool.stake(
        amount,
        {from: trader1}
      )
    let i=0;
    while (i<50) {
      await pool.stake(
        amount,
        {from: trader2}
      );
      i++;
    }
    const amountOfGas = await pool.stake.estimateGas(amount, {from: trader3});
    console.log('gas amount: ', amountOfGas);
  });

  it('Test 3: should 150 user stake', async () => {
    await increaseTime(1);
    const amount = web3.utils.toWei('0.01');
    await pool.stake(
        amount,
        {from: trader1}
      )
    let i=0;
    while (i<50) {
      await pool.stake(
        amount,
        {from: trader2}
      );
      i++;
    }
    const amountOfGas = await pool.stake.estimateGas(amount, {from: trader3});
    console.log('gas amount: ', amountOfGas);
  });

  it('Test 4: should 200 user stake', async () => {
    await increaseTime(1);
    const amount = web3.utils.toWei('0.01');
    for (let i = 0; i < 50; i++) {
      let trader = trader1
      if (i % 2 == 0 ) {
        trader = trader2
      } else {
        trader = trader4
      }
      await pool.stake(
        amount,
        {from: trader}
      );
    }

    let i=0;
    while (i<50) {
      await pool.stake(
        amount,
        {from: trader2}
      );
      i++;
    }
    const amountOfGas = await pool.stake.estimateGas(amount, {from: trader3});
    console.log('gas amount: ', amountOfGas);
  });
});
