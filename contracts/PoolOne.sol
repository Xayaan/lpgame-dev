// SPDX-License-Identifier:  CC-BY-NC-4.0
// email "contracts [at] royalprotocol.io" for licensing information
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';

contract PoolOne is ReentrancyGuard {
    using SafeMath for uint;
    struct Stake {
        uint cycleJoined;
        uint lastDeposit;
        bool lastDepositEndCycle;
        uint numberOfDeposits;
        uint poolTokens;
        uint pendingTokens;
        uint rewards;
        uint totalRewards;
    }

    address public lpAddressContract;
    address public gRoyAddressContract;
    mapping(address => Stake) public stakers;
    mapping(address =>  uint) public stakedBalances;

    uint public rTotalSupply;
    uint public fTotalSupply;
    uint public rTotalSupplyNew;
    uint public fTotalSupplyNew;
    // struct FakeBlock {
    //     uint timestamp;
    // }

    // FakeBlock block;

    // uint public now;

    // function setBlockTime(uint val) external {
    //     now = val;
    //     block.timestamp = val;
    // }

    function checkTheShit() external checkCycle() {
        //TODO: DELETE ME FOR PROD
    }


    address public admin;
    uint public totalStaked;
    uint public totalReflected;
    uint public totalPoolTokens; //might be redundant because we have totalStaked but this way we should remain rounder?
    uint public totalPendingTokens;
    // start = specific block
    uint public start = block.timestamp;
    uint public cycles; //14 * 24 for prod
    uint public totalDistributions;
    uint public poolTokenRewards;
    uint public currentCycle;
    uint public lastCycleCheckedForDistribution;
    uint public cycleLength; // 3600 for prod
    uint public end; //TODO: Handle End of contract
    uint public depositFee = 5;
    uint public withdrawFee = 5;
    uint private oneHundredPercent = 10000;

    uint public constant minDeposit = 1000000000000000; //1000000 gwei
    uint public maxTopStakerCount = 20;
    address[] public stakeHolders;
    address public lastStaker;
    uint256 public lastStakedAmount;

    function getCycleRewardsPerToken() public view returns(uint) {
        if (totalPoolTokens == 0) {
            return 0;
        }
        return poolTokenRewards.div(cycles).div(totalPoolTokens);
    }

    function rewardEligibleThisCycle() view public returns(bool) {
        uint contractDuration = block.timestamp.sub(start); //cycleLength.mul(currentCycle).add(start);
        if (contractDuration < cycleLength) {
            return contractDuration < cycleLength.div(2); // fix for first cycle
        }
        uint contractCycles = contractDuration.div(cycleLength);
        return contractDuration.sub(contractCycles.mul(cycleLength)) < cycleLength.div(2); // ensure they're in the first half of this cycle
    }

    constructor(
        address _tokenAddress,
        address _gRoyAddress,
        uint _rewards,
        uint _cycles,
        uint _length
    ) {
        admin = msg.sender;
        lpAddressContract = _tokenAddress;
        gRoyAddressContract = _gRoyAddress;
        poolTokenRewards = _rewards * 10 ** 18;
        cycles = _cycles;
        cycleLength = _length;
        end = cycles.mul(cycleLength).add(start);
    }

    function updateLPToken(address _tokenAddress) public onlyAdmin() {
        lpAddressContract = _tokenAddress;
    }

    function updateGroyToken(address _tokenAddress) public onlyAdmin() {
        gRoyAddressContract = _tokenAddress;
    }

    function updateWithdrawFee(uint _newFee) public onlyAdmin() {
        require(_newFee <= 5, "more smol please");
        withdrawFee = _newFee;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "admin!");
        _;
    }

    modifier ensureDepositSize(uint amount) {
        require(amount >= minDeposit, "stake amount not large enough");
        _;
    }

    modifier checkCycle() {
        currentCycle = block.timestamp.sub(start).div(cycleLength).add(1);
        if (currentCycle > lastCycleCheckedForDistribution && totalDistributions < cycles) {
            if (lastCycleCheckedForDistribution == 0) {//skip rewards in cycle 1
                lastCycleCheckedForDistribution = 1;
                // totalDistributions = 1;// Should be 0 because 0,1,2,3 to get here
            }
            uint cyclesToReward;
            bool ended;

            if (currentCycle > cycles || block.timestamp > end) {//if the contract is over let's ensure this is the last distribution
                cyclesToReward = cycles.sub(totalDistributions); //add 1 cuz we need to distribute for the last cycle
                totalDistributions = cycles;
                ended = true;
            } else {
                cyclesToReward = currentCycle.sub(lastCycleCheckedForDistribution);// usually 1, can be more if we've skipped some cycles
            }

            // if (currentCycle == 1) {// same as line 97
            //     cyclesToReward = 0;
            // }

            uint rewardsPerToken = getCycleRewardsPerToken();
            bool rewardThisCycle;
            if (totalPoolTokens > 0) {
                rewardThisCycle = true;
            }

            if (cyclesToReward > 1) {
                if (rewardThisCycle) {
                    totalDistributions += 1; // we know we are going to give out rewards at this point only so let's increase this by one since we are only giving one reward
                    cyclesToReward -= 1;
                } else {// we know we do not want to give any rewards this cycle because no one had pool tokens at all before we started checking
                    if ( !ended ) {
                        cyclesToReward = 0;
                    }
                }

                for (uint i; i < stakeHolders.length; i++) {
                    Stake storage holder = stakers[stakeHolders[i]];
                    if (holder.poolTokens > 0 || holder.pendingTokens > 0) {
                        // assert(cyclesToReward > 0);

                        uint holderRewards = holder.poolTokens.mul(rewardsPerToken);// this is already 0 if we have no pool tokens so we essentially give 0 reward, we just shuffle pending if we need to
                        if (cyclesToReward == 0) {holderRewards = 0;}
                        holder.rewards = holder.rewards.add(holderRewards);
                        holder.totalRewards = holder.totalRewards.add(holderRewards);

                        holder.poolTokens = holder.poolTokens.add(holder.pendingTokens);
                        totalPoolTokens = totalPoolTokens.add(holder.pendingTokens);
                        totalPendingTokens = totalPendingTokens.sub(holder.pendingTokens);
                        holder.pendingTokens = 0;
                    }
                }
                rewardsPerToken = getCycleRewardsPerToken(); // update rewards per token because we have done some shuffling and we might need to reward the people for cycles we just shuffled
            }

            // if (cyclesToReward + totalDistributions >= cycles) {
            //     cyclesToReward = cycles - totalDistributions;
            // }
            if ( !ended ) {
                if (rewardThisCycle) {// if no one has pool tokens we do not distribute at all, we are simply shuffling pending tokens around
                    totalDistributions += cyclesToReward; // we know we are going to give out rewards at this point only so let's increase this by one since we are only giving one reward
                    // lastCycleCheckedForDistribution = currentCycle;
                } else {
                    cyclesToReward = 0;
                }
            }

            for (uint i; i < stakeHolders.length; i++) {
                Stake storage holder = stakers[stakeHolders[i]];

                if (holder.poolTokens > 0 || holder.pendingTokens > 0) {
                    uint holderRewards = holder.poolTokens.mul(rewardsPerToken).mul(cyclesToReward);
                    if (cyclesToReward == 0) {holderRewards = 0;}
                    holder.rewards = holder.rewards.add(holderRewards);
                    holder.totalRewards = holder.totalRewards.add(holderRewards);

                    holder.poolTokens = holder.poolTokens.add(holder.pendingTokens);
                    totalPoolTokens = totalPoolTokens.add(holder.pendingTokens);
                    totalPendingTokens = totalPendingTokens.sub(holder.pendingTokens);
                    holder.pendingTokens = 0;
                }
            }

            lastCycleCheckedForDistribution = currentCycle; // this will disallow rewards and pendingtokens -> pooltokens the rest of this round
        }
        _;
    }

    modifier stopDeposits() {
        require(block.timestamp > start, "You are getting a little ahead of yourself, be patient, everyone will be allowed in the pool");
        require(block.timestamp < end, "You may have missed the pool but this is only the beginning.");
        if (currentCycle >= cycles) {
                require(rewardEligibleThisCycle(), "You have missed the last deposit cutoff, watch Dark to learn more about the Last Cycle.");
            }
        _;
    }

    event StakeEvent(address indexed _address, uint amount);
    function stake(uint amount) external ensureDepositSize(amount) stopDeposits() nonReentrant checkCycle() {
        rTotalSupply = rTotalSupplyNew;
        fTotalSupply = fTotalSupplyNew;

        IERC20(lpAddressContract)
            .transferFrom(
                msg.sender,
                address(this),
                amount);

        bool rewardEligible = rewardEligibleThisCycle();
        uint poolTokens;
        uint pendingTokens;
        uint normalizedTokens = amount.div(minDeposit);
        uint reflectedTaxAmount;
        uint reflectedDistributionAmount;
        Stake storage holder = stakers[msg.sender];

        if (rewardEligible == true) {
            poolTokens = normalizedTokens;
        } else {
            pendingTokens = normalizedTokens;
        }

        if (holder.cycleJoined > 0) {
            holder.lastDeposit = currentCycle;
            holder.lastDepositEndCycle = rewardEligible;
            holder.numberOfDeposits += 1;
            holder.poolTokens += poolTokens;
            holder.pendingTokens += pendingTokens;
        } else {
            stakers[msg.sender] = Stake(currentCycle, currentCycle, rewardEligible, 1, poolTokens, pendingTokens, 0, 0);
        }

        totalPoolTokens += poolTokens;
        totalPendingTokens += pendingTokens;
        reflectedTaxAmount = amount.mul(depositFee) / 100; // get the reflected amount (they get half reflection)
        reflectedDistributionAmount = reflectedTaxAmount / 2;// half the tax gets distributed
        uint256 newStakedAmount = amount.sub(reflectedTaxAmount);
        rTotalSupplyNew += newStakedAmount;
        // fTotalSupplyNew += rTotalSupplyNew.mul(rTotalSupplyNew.add(reflectedDistributionAmount)).div(rTotalSupplyNew);
        if (rTotalSupply > 0 && fTotalSupply > 0
            && !(lastStaker == msg.sender && lastStakedAmount == stakedBalances[msg.sender]))
        {
            fTotalSupplyNew = fTotalSupply.mul(rTotalSupplyNew.add(reflectedTaxAmount)).div(rTotalSupply);
            stakedBalances[msg.sender] += newStakedAmount.mul(rTotalSupplyNew).div(fTotalSupplyNew);
        } else {
            fTotalSupplyNew += rTotalSupplyNew;
            stakedBalances[msg.sender] += newStakedAmount;
        }

        // Keep top 20 stakers
        bool alreadyAdded = false;
        if (stakeHolders.length < maxTopStakerCount) {
            for (uint256 i = 0; i < stakeHolders.length; i++) {
                if (stakeHolders[i] == msg.sender) {
                    alreadyAdded = true;
                    break;
                }
            }
            if (alreadyAdded == false) {
                stakeHolders.push(msg.sender);
            }
        }

        // Keep last staker address and stake amount
        if (lastStaker != msg.sender) {
            lastStaker = msg.sender;
            lastStakedAmount = newStakedAmount;
        } else {
            lastStakedAmount += newStakedAmount;
        }

        totalStaked += amount;
        totalReflected += reflectedTaxAmount;
        emit StakeEvent(msg.sender, amount);
    }

    // on deposit give them a certain number of pool tokens 1000 per actual token
    event WithdrawalEvent(address indexed _address, uint amount);
    function withdraw(uint amount) external nonReentrant checkCycle() {
        uint senderBalance = _stakedBalances(msg.sender);
        require(senderBalance >= amount && amount > 0,'not enough funds');//ensure they have the full amount requested
        uint withdrawAmount;
        uint reflectedTaxAmount;
        uint reflectedDistributionAmount;
        reflectedTaxAmount = amount.mul(withdrawFee) / 100; // get the reflected amount (they get half reflection)
        reflectedDistributionAmount = reflectedTaxAmount / 2;
        withdrawAmount = senderBalance.sub(reflectedTaxAmount);

        stakedBalances[msg.sender] = senderBalance.sub(amount);
        Stake storage holder = stakers[msg.sender];

        uint senderTotalPoolTokens = holder.poolTokens + holder.pendingTokens;
        uint totalOverallPoolTokens = totalPoolTokens + totalPendingTokens;
        totalOverallPoolTokens = totalOverallPoolTokens.sub(senderTotalPoolTokens);

        totalPoolTokens = totalPoolTokens.sub(holder.poolTokens);

        IERC20(lpAddressContract).transfer(
            msg.sender,
            withdrawAmount
            );

        uint poolTokens = 0;
        uint pendingTokens = 0;
        uint normalizedTokens = stakedBalances[msg.sender].div(minDeposit);
        bool rewardEligible = rewardEligibleThisCycle();

        if (rewardEligible == true) {
            poolTokens = normalizedTokens;
        } else {
            pendingTokens = normalizedTokens;
        }

        holder.poolTokens = poolTokens;
        totalPoolTokens = totalPoolTokens.add(holder.poolTokens); // we remove all the pool tokens earlier to rebalance, we have to make sure we add again
        holder.pendingTokens = pendingTokens;

        // totalStaked = totalStaked.sub(amount);
        totalReflected += reflectedTaxAmount;
        emit WithdrawalEvent(msg.sender, withdrawAmount);
    }

    event GroyClaimEvent(address indexed _address, uint amount);
    function withdrawGroy(uint amount) external nonReentrant checkCycle() {
        Stake storage holder = stakers[msg.sender];
        require(holder.rewards >= amount && amount > 0,'not enough funds');
        holder.rewards = holder.rewards.sub(amount);

        IERC20(gRoyAddressContract).transfer(
            msg.sender,
            amount
            );
        emit GroyClaimEvent(msg.sender, amount);
    }

    function getPercent(uint part, uint whole) internal pure returns(uint percent) {
        uint numerator = part.mul(100000);//I want to return a 4 decimal percent
        uint temp = numerator.div(whole).add(5);
        return temp.div(10);
    }

    function percentageOfPool(address wallet) view public returns(uint) {
        if (totalPoolTokens == 0) {
            return 0;
        }
        uint stakedAmount = stakers[wallet].poolTokens;
        return getPercent(stakedAmount, totalPoolTokens);
    }

    function _stakedBalances(address staker) public view returns (uint) {
        uint256 bal = stakedBalances[staker];

        if (lastStaker == staker && lastStakedAmount == bal) {
            return bal;
        }
        else {
            return bal * fTotalSupplyNew / rTotalSupplyNew;
        }
    }
}
