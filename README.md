# RP liquidity pool game

This is a truffle project. Tests are passing.

Current issue:

Unknown gas at higher user numbers, would like to implement rTotal and tTotal style inflation from safemoon to save gas fees

## Usage

This contract is used for staking and withdrawing.

## Staking

Users stake their tokens to liquidity pool and top 20 holders can get rewards.

The staked balance is calculated by the rate of rTotal and fTotal.

By using the simple rule (fTotal / rTotal), it saves gas fees a lot.

## Withdrawing

Users can withdraw token after staking cycle finished.

The amount of withdraw is calculated by the rate of rTotal and tTotal.

## Info

This staking 