# Features

## 1. Swapping

#### V3 core contracts:

- **V3Factory** 
	- **Description**: manages ownership and control over pool protocol fees
	- **Details**:
		- `owner` -- current owner of the factory (modifiable via setOwner)
		- `mapping(uint24 => int24) feeAmountTickSpacing`: A fee amount can never be removed, so this value should be hard coded or cached in the calling context
		- `createPool(address tokenA, address tokenB, uint24 fee)`: Creates a pool for the given two tokens and fee
		- `enableFeeAmount(uint24 fee, int24 tickSpacing)`: Enables a fee amount with the given tickSpacing. Fee amounts may never be removed once enabled
- **V3PoolDeployer**
	- **Description**: (invoked by V3Factory) Responsible for deploying new liquidity pools.
	- **Details**:
		- `deploy(address factory,address token0,address token1,uint24 fee, int24 tickSpacing)`: Deploys a new pool with the specified tokens and fee.
- **SwapRouter**
	- **Description**: V3 swap router
	- **Details**:
		- get pool address and calculate swap amount
- **SmartRouter** 
	- **Description**: inherent V3 router, V2 router, and stableSwap router 
- **V3Migrator** 
	- **Description**: Handles migration of liquidity from older versions to V3
	- Details:
		- `migrate(MigrateParams calldata)`: Migrates liquidity from a specified pair.

#### V3 helper contracts (view only):

- **QuoterV2**
	- **Description**: Provides quotes for V3 without executing them. (Helper contract for operation, not used by any contracts)
	- **Details**:
		- `quoteExactInput`, `quoteExactInputSingle`, `quoteExactOutputSingle`, `quoteExactOutput`
- **MixedRouteQuoterV1**
	- Description: Provide quotes for V2, V3, Stableswap, and MixedRoute
		- `quoteExactInputSingleV2`, `quoteExactInputSingleV3`,  `quoteExactInputSingleStable`
		- `quoteExactInput(bytes memory path,uint256[] memory flag, uint256 amountIn)` can choose to invokes the V2, V3, or Stable using `flag`
- **TickLens**
	- **Description**: Provides information about ticks in the liquidity pools.
	- **Details**:
		- `function getPopulatedTicksInWord(address pool, int16 tickBitmapIndex) public view returns (struct ITickLens.PopulatedTick[] populatedTicks)`
		- get an array of tick data for the given word in the tick bitmap
- **SmartRouterHelper**
	- **Description**: **Contain init code hash**. Library contracts for routers
- **TokenValidator**
	- **Description**: Validate tokens swap by doing a flash loan. Not used by any contracts. Not used in the frontend as well.
#### Stableswap core contracts:

Designed to swap specific assets that are priced closely – such as USD stablecoins (e.g. HAY, BUSD and USDT) or liquid staking tokens (e.g. stkBNB and BNBx).

- **StableSwapFactory**
	- **Description**: correspond to V3Factory
- **StableSwapTwoPoolDeployer** and **StableSwapThreePoolDeployer**
	- **Description**: correspond to V3PoolDeployer
- **StableSwapLPFactory**
	- **Description**: Create LP token for pools
- **StableSwapTwoPool** and **StableSwapThreePool**
	- **Description**: Template contracts for stableswap pairs

#### Stableswap helper contracts (view only):

- **GainStableSwapInfo**
	- **Description**: will direct to StableSwapTwoPoolInfo and StableSwapThreePoolInfo


### 2. Farming

- **GainToken**
	- **Description**:
	- **Details**:
		- 
- **SyrupBar**
	- **Description**:
	- **Details**:
		- 
- **MasterChef** and **MasterChefV2** and **MasterChefV3**
	- **Description**: Staking contract for distributing and managing Gain emissions
	- **Details**:
		- `setReceiver` set the address to upkeep the pools
		- `upkeep(uint256 _amount, uint256 _duration, bool _withUpdate) onlyReceiver`: Inject rewards with a distribution period. Can also update across all pools to ensure the rewards are distributed.
- **MasterChefV3Receiver**
	- **Description**:
- **V3LmPoolDeployer**
	- **Description**:


### 3. Voting
- **VEMan**
	- **Description**: vote-escrowed Gain. Not transferrable. Can only be obtained by staking Gain
- **GaugeVoting**
	- **Description**:
		- 
