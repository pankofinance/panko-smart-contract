// SPDX-License-Identifier: MIT
pragma solidity =0.8.26;
pragma experimental ABIEncoderV2;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import '@openzeppelin/contracts/utils/cryptography/EIP712.sol';
import '@openzeppelin/contracts/utils/Address.sol';

import '../interfaces/IWETH.sol';

import './interfaces/IIFOV1.sol';

/**
 * @title IFOInitializableV1
 */
contract IFOInitializableV1 is IIFOV1, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    using Address for address payable;

    address public constant ETHER_ADDRESS = address(0);

    // Number of pools
    uint8 public constant NUMBER_POOLS = 2;

    // The address of the ifo factory
    address public immutable IFO_FACTORY;

    // Max buffer seconds (for sanity checks)
    uint256 public MAX_BUFFER_SECONDS;

    // Max pool id (sometimes only public sale exist)
    uint8 public MAX_POOL_ID;

    IWETH public weth;

    // The LP token used
    address public quoteToken;

    // The offering token
    IERC20 public offeringToken;

    // Whether it is initialized
    bool public isInitialized;

    // The timestamp when IFO starts
    uint256 public startTimestamp;

    // The timestamp when IFO ends
    uint256 public endTimestamp;

    // The campaignId for the IFO
    uint256 public campaignId;

    // Total tokens distributed across the pools
    uint256 public totalTokensOffered;

    address public signerAddress;

    // Array of PoolCharacteristics of size NUMBER_POOLS
    PoolCharacteristics[NUMBER_POOLS] private _poolInformation;

    // It maps the address to pool id to UserInfo
    mapping(address => mapping(uint8 => UserInfo)) private _userInfo;

    // Struct that contains each pool characteristics
    struct PoolCharacteristics {
        uint256 raisingAmountPool; // amount of tokens raised for the pool (in LP tokens)
        uint256 offeringAmountPool; // amount of tokens offered for the pool (in offeringTokens)
        uint256 limitUserInQuote; // limit of tokens per user (if 0, it is ignored)
        bool hasTax; // tax on the overflow (if any, it works with _calculateTaxOverflow)
        uint256 flatTaxRate; // new rate for flat tax
        uint256 totalAmountPool; // total amount pool deposited (in LP tokens)
        uint256 sumTaxesOverflow; // total taxes collected (starts at 0, increases with each harvest if overflow)
        SaleType saleType; // previously bool checking if a sale is special(private), currently uint act as "sale type"
        // 0: public sale
        // 1: private sale
        uint256 vestingPercentage; // 60 means 0.6, rest part such as 100-60=40 means 0.4 is claimingPercentage
        uint256 vestingCliff; // Vesting cliff
        uint256 vestingDuration; // Vesting duration
        uint256 vestingSlicePeriodSeconds; // Vesting slice period seconds
    }

    // Struct that contains each user information for both pools
    struct UserInfo {
        uint256 amountPool; // How many tokens the user has provided for pool
        bool claimedPool; // Whether the user has claimed (default: false) for pool
    }

    // vesting startTime, everyone will be started at same timestamp
    uint256 public vestingStartTime;

    // A flag for vesting is being revoked
    bool public vestingRevoked;

    // Struct that contains vesting schedule
    struct VestingSchedule {
        bool isVestingInitialized;
        // beneficiary of tokens after they are released
        address beneficiary;
        // pool id
        uint8 pid;
        // total amount of tokens to be released at the end of the vesting
        uint256 amountTotal;
        // amount of tokens has been released
        uint256 released;
    }

    bytes32[] private vestingSchedulesIds;
    mapping(bytes32 => VestingSchedule) private vestingSchedules;
    uint256 private vestingSchedulesTotalAmount;
    mapping(address => uint256) private holdersVestingCount;

    // Admin withdraw events
    event AdminWithdraw(uint256 amountLP, uint256 amountOfferingToken);

    // Admin recovers token
    event AdminTokenRecovery(address tokenAddress, uint256 amountTokens);

    // Deposit event
    event Deposit(address indexed user, uint256 amount, uint8 indexed pid);

    // Harvest event
    event Harvest(address indexed user, uint256 offeringAmount, uint256 excessAmount, uint8 indexed pid);

    // Create VestingSchedule event
    event CreateVestingSchedule(address indexed user, uint256 offeringAmount, uint256 excessAmount, uint8 indexed pid);

    // Event for new start & end timestamps
    event NewStartAndEndTimestamps(uint256 startTimestamp, uint256 endTimestamp);

    // Event when parameters are set for one of the pools
    event PoolParametersSet(uint256 offeringAmountPool, uint256 raisingAmountPool, uint8 pid);

    // Event when released new amount
    event Released(address indexed beneficiary, uint256 amount);

    // Event when revoked
    event Revoked();

    /**
     * @notice Constructor
     */
    constructor() {
        IFO_FACTORY = msg.sender;
    }

    /**
     * @notice It initializes the contract
     * @dev It can only be called once.
     * @param _quoteToken: the quote token used
     * @param _offeringToken: the token that is offered for the IFO
     * @param _startTimestamp: the start timestamp for the IFO
     * @param _endTimestamp: the end timestamp for the IFO
     * @param _maxBufferSeconds: maximum buffer of blocks from the current block number
     * @param _maxPoolId: maximum id of pools, sometimes only public sale exist
     * @param _adminAddress: the admin address for handling tokens
     * @param _weth: the WETH address
     */
    function initialize(
        address _quoteToken,
        address _offeringToken,
        uint256 _startTimestamp,
        uint256 _endTimestamp,
        uint256 _maxBufferSeconds,
        uint8 _maxPoolId,
        address _adminAddress,
        address _weth
    ) public {
        require(!isInitialized, 'Already initialized');
        require(msg.sender == IFO_FACTORY, 'Not factory');
        require(_maxPoolId < NUMBER_POOLS, 'Should not larger than NUMBER_POOLS');

        // Make this contract initialized
        isInitialized = true;

        quoteToken = _quoteToken;
        offeringToken = IERC20(_offeringToken);
        startTimestamp = _startTimestamp;
        endTimestamp = _endTimestamp;
        MAX_BUFFER_SECONDS = _maxBufferSeconds;
        MAX_POOL_ID = _maxPoolId;

        // Transfer ownership to admin
        transferOwnership(_adminAddress);
    }

    /**
     * @notice It allows users to deposit LP tokens to pool
     * @param _amount: the number of LP token used (18 decimals)
     * @param _pid: pool id
     */
    function depositPool(uint256 _amount, uint8 _pid) external payable override nonReentrant {
        // Checks whether the pool id is valid
        require(_pid <= MAX_POOL_ID, 'Deposit: Non valid pool id');
        require(_poolInformation[_pid].saleType == SaleType.PUBLIC, 'Deposit: Pool is not public');
        _deposit(_amount, _pid);
    }

    /**
     * @notice It allows users to deposit LP tokens to pool
     * @param _amount: the number of LP token used (18 decimals)
     * @param _pid: pool id
     */
    function depositPrivatePool(uint256 _amount, uint8 _pid, bytes memory _sig) external payable override nonReentrant {
        // Checks whether the pool id is valid
        require(_pid <= MAX_POOL_ID, 'Deposit: Non valid pool id');
        require(_poolInformation[_pid].saleType == SaleType.PRIVATE, 'Deposit: Pool is not private');
        // TODO: verify sig
        _deposit(_amount, _pid);
    }

    function _deposit(uint256 _amount, uint8 _pid) internal {
        // Checks that pool was set
        require(
            _poolInformation[_pid].offeringAmountPool > 0 && _poolInformation[_pid].raisingAmountPool > 0,
            'Deposit: Pool not set'
        );

        // Checks whether the timestamp is not too early
        require(block.timestamp > startTimestamp, 'Deposit: Too early');

        // Checks whether the timestamp is not too late
        require(block.timestamp < endTimestamp, 'Deposit: Too late');

        // Checks that the amount deposited is not inferior to 0
        require(_amount > 0, 'Deposit: Amount must be > 0');

        // Verify tokens were deposited properly
        require(offeringToken.balanceOf(address(this)) >= totalTokensOffered, 'Deposit: Tokens not deposited properly');

        // Transfers funds to this contract
        if (quoteToken == ETHER_ADDRESS) {
            require(msg.value == _amount, 'Deposit: Value != amount');
        } else {
            IERC20(quoteToken).safeTransferFrom(msg.sender, address(this), _amount);
        }

        // Update the user status
        _userInfo[msg.sender][_pid].amountPool = _userInfo[msg.sender][_pid].amountPool.add(_amount);

        // Check if the pool has a limit per user
        if (_poolInformation[_pid].limitUserInQuote > 0) {
            // Checks whether the limit has been reached
            require(
                _userInfo[msg.sender][_pid].amountPool <= _poolInformation[_pid].limitUserInQuote,
                'Deposit: New amount above user limit'
            );
        }

        // Updates the totalAmount for pool
        _poolInformation[_pid].totalAmountPool = _poolInformation[_pid].totalAmountPool.add(_amount);

        emit Deposit(msg.sender, _amount, _pid);
    }

    /**
     * @notice It allows users to harvest from pool
     * @param _pid: pool id
     */
    function harvestPool(uint8 _pid) external payable override nonReentrant {
        // Checks whether it is too early to harvest
        require(block.timestamp > endTimestamp, 'Harvest: Too early');

        // Checks whether pool id is valid
        require(_pid <= MAX_POOL_ID, 'Harvest: Non valid pool id');

        // Checks whether the user has participated
        require(_userInfo[msg.sender][_pid].amountPool > 0, 'Harvest: Did not participate');

        // Checks whether the user has already harvested
        require(!_userInfo[msg.sender][_pid].claimedPool, 'Harvest: Already done');

        // Updates the harvest status
        _userInfo[msg.sender][_pid].claimedPool = true;

        // Updates the vesting startTime
        if (vestingStartTime == 0) {
            vestingStartTime = block.timestamp;
        }

        // Initialize the variables for offering, refunding user amounts, and tax amount
        (
            uint256 offeringTokenAmount,
            uint256 refundingTokenAmount,
            uint256 userTaxOverflow
        ) = _calculateOfferingAndRefundingAmountsPool(msg.sender, _pid);

        // Increment the sumTaxesOverflow
        if (userTaxOverflow > 0) {
            _poolInformation[_pid].sumTaxesOverflow = _poolInformation[_pid].sumTaxesOverflow.add(userTaxOverflow);
        }

        // Transfer these tokens back to the user if quantity > 0
        if (offeringTokenAmount > 0) {
            if (100 - _poolInformation[_pid].vestingPercentage > 0) {
                uint256 amount = offeringTokenAmount.mul(100 - _poolInformation[_pid].vestingPercentage).div(100);

                // Transfer the tokens at TGE
                offeringToken.safeTransfer(msg.sender, amount);

                emit Harvest(msg.sender, amount, refundingTokenAmount, _pid);
            }
            // If this pool is Vesting modal, create a VestingSchedule for each user
            if (_poolInformation[_pid].vestingPercentage > 0) {
                uint256 amount = offeringTokenAmount.mul(_poolInformation[_pid].vestingPercentage).div(100);

                // Create VestingSchedule object
                _createVestingSchedule(msg.sender, _pid, amount);

                emit CreateVestingSchedule(msg.sender, amount, refundingTokenAmount, _pid);
            }
        }

        if (refundingTokenAmount > 0) {
            if (quoteToken == ETHER_ADDRESS) {
                payable(msg.sender).sendValue(refundingTokenAmount);
            } else {
                IERC20(quoteToken).safeTransfer(msg.sender, refundingTokenAmount);
            }
        }
    }

    /**
     * @notice It allows the admin to withdraw funds
     * @param _quoteAmount: the number of quote token to withdraw (18 decimals)
     * @param _offerAmount: the number of offering amount to withdraw
     * @dev This function is only callable by admin.
     */
    function finalWithdraw(uint256 _quoteAmount, uint256 _offerAmount) external override onlyOwner {
        require(_quoteAmount <= quoteToken.balanceOf(address(this)), 'Not enough LP tokens');
        require(_offerAmount <= offeringToken.balanceOf(address(this)), 'Not enough offering tokens');

        if (_quoteAmount > 0) {
            quoteToken.safeTransfer(msg.sender, _quoteAmount);
        }

        if (_offerAmount > 0) {
            offeringToken.safeTransfer(msg.sender, _offerAmount);
        }

        emit AdminWithdraw(_quoteAmount, _offerAmount);
    }

    /**
     * @notice It allows the admin to recover wrong tokens sent to the contract
     * @param _tokenAddress: the address of the token to withdraw (18 decimals)
     * @param _tokenAmount: the number of token amount to withdraw
     * @dev This function is only callable by admin.
     */
    function recoverWrongTokens(address _tokenAddress, uint256 _tokenAmount) external onlyOwner {
        require(_tokenAddress != address(quoteToken), 'Recover: Cannot be LP token');
        require(_tokenAddress != address(offeringToken), 'Recover: Cannot be offering token');

        IERC20(_tokenAddress).safeTransfer(msg.sender, _tokenAmount);

        emit AdminTokenRecovery(_tokenAddress, _tokenAmount);
    }

    /**
     * @notice It sets parameters for pool
     * @param _offeringAmountPool: offering amount (in tokens)
     * @param _raisingAmountPool: raising amount (in LP tokens)
     * @param _limitPerUserInLP: limit per user (in LP tokens)
     * @param _hasTax: if the pool has a tax
     * @param _flatTaxRate: flat tax rate
     * @param _pid: pool id
     * @param _saleType: // previously bool checking if a sale is special(private), currently uint act as "sale type"
        // 0: public sale
        // 1: private sale
        // 2: basic sale
     * @param _vestingPercentage: percentage for vesting remain tokens after end IFO
     * @param _vestingCliff: cliff of vesting
     * @param _vestingDuration: duration of vesting
     * @param _vestingSlicePeriodSeconds: slice period seconds of vesting
     * @dev This function is only callable by admin.
     */
    function setPool(
        uint256 _offeringAmountPool,
        uint256 _raisingAmountPool,
        uint256 _limitPerUserInLP,
        bool _hasTax,
        uint256 _flatTaxRate,
        uint8 _pid,
        SaleType _saleType,
        uint256 _vestingPercentage,
        uint256 _vestingCliff,
        uint256 _vestingDuration,
        uint256 _vestingSlicePeriodSeconds
    ) external override onlyOwner {
        require(block.timestamp < startTimestamp, 'IFO has started');
        require(_pid <= MAX_POOL_ID, 'Pool does not exist');
        require(_flatTaxRate < 1e12, 'Flat tax rate must be less than 1e12');
        require(
            _vestingPercentage >= 0 && _vestingPercentage <= 100,
            'vesting percentage should exceeds 0 and interior 100'
        );
        require(_vestingDuration > 0, 'duration must exceeds 0');
        require(_vestingSlicePeriodSeconds >= 1, 'slicePeriodSeconds must be exceeds 1');
        require(_vestingSlicePeriodSeconds <= _vestingDuration, 'slicePeriodSeconds must be interior duration');

        _poolInformation[_pid].offeringAmountPool = _offeringAmountPool;
        _poolInformation[_pid].raisingAmountPool = _raisingAmountPool;
        _poolInformation[_pid].limitUserInQuote = _limitPerUserInLP;
        _poolInformation[_pid].hasTax = _hasTax;
        if (!_hasTax) {
            require(_flatTaxRate == 0, 'hasTax is false, flatTaxRate has to be 0');
        }
        _poolInformation[_pid].flatTaxRate = _flatTaxRate;
        _poolInformation[_pid].saleType = _saleType;
        _poolInformation[_pid].vestingPercentage = _vestingPercentage;
        _poolInformation[_pid].vestingCliff = _vestingCliff;
        _poolInformation[_pid].vestingDuration = _vestingDuration;
        _poolInformation[_pid].vestingSlicePeriodSeconds = _vestingSlicePeriodSeconds;

        uint256 tokensDistributedAcrossPools;

        for (uint8 i = 0; i <= MAX_POOL_ID; i++) {
            tokensDistributedAcrossPools = tokensDistributedAcrossPools.add(_poolInformation[i].offeringAmountPool);
        }

        // Update totalTokensOffered
        totalTokensOffered = tokensDistributedAcrossPools;

        emit PoolParametersSet(_offeringAmountPool, _raisingAmountPool, _pid);
    }

    /**
     * @notice It allows the admin to update start and end blocks
     * @param _startTimestamp: the new start timestamp
     * @param _endTimestamp: the new end timestamp
     * @dev This function is only callable by admin.
     */
    function updateStartAndEndTimestamps(uint256 _startTimestamp, uint256 _endTimestamp) external onlyOwner {
        require(_endTimestamp < (block.timestamp + MAX_BUFFER_SECONDS), 'End too far');
        require(block.timestamp < startTimestamp, 'IFO has started');
        require(_startTimestamp < _endTimestamp, 'New start timestamp must be lower than new end timestamp');
        require(block.timestamp < _startTimestamp, 'New start timestamp must be higher than current block timestamp');

        startTimestamp = _startTimestamp;
        endTimestamp = _endTimestamp;

        emit NewStartAndEndTimestamps(_startTimestamp, _endTimestamp);
    }

    /**
     * @notice It returns the pool information
     * @param _pid: pool id
     * @return raisingAmountPool: amount of LP tokens raised (in LP tokens)
     * @return offeringAmountPool: amount of tokens offered for the pool (in offeringTokens)
     * @return limitUserInQuote; // limit of tokens per user (if 0, it is ignored)
     * @return hasTax: tax on the overflow (if any, it works with _calculateTaxOverflow)
     * @return flatTaxRate: new rate of flat tax
     * @return totalAmountPool: total amount pool deposited (in LP tokens)
     * @return sumTaxesOverflow: total taxes collected (starts at 0, increases with each harvest if overflow)
     */
    function viewPoolInformation(
        uint256 _pid
    ) external view override returns (uint256, uint256, uint256, bool, uint256, uint256, SaleType) {
        return (
            _poolInformation[_pid].raisingAmountPool,
            _poolInformation[_pid].offeringAmountPool,
            _poolInformation[_pid].limitUserInQuote,
            _poolInformation[_pid].hasTax,
            _poolInformation[_pid].totalAmountPool,
            _poolInformation[_pid].sumTaxesOverflow,
            _poolInformation[_pid].saleType
        );
    }

    /**
     * @notice It returns the pool vesting information
     * @param _pid: pool id
     * @return vestingPercentage: the percentage of vesting part, claimingPercentage + vestingPercentage should be 100
     * @return vestingCliff: the cliff of vesting
     * @return vestingDuration: the duration of vesting
     * @return vestingSlicePeriodSeconds: the slice period seconds of vesting
     */
    function viewPoolVestingInformation(
        uint256 _pid
    ) external view override returns (uint256, uint256, uint256, uint256) {
        return (
            _poolInformation[_pid].vestingPercentage,
            _poolInformation[_pid].vestingCliff,
            _poolInformation[_pid].vestingDuration,
            _poolInformation[_pid].vestingSlicePeriodSeconds
        );
    }

    /**
     * @notice It returns the tax overflow rate calculated for a pool
     * @dev 100,000,000,000 means 0.1 (10%) / 1 means 0.0000000000001 (0.0000001%) / 1,000,000,000,000 means 1 (100%)
     * @param _pid: pool id
     * @return It returns the tax percentage
     */
    function viewPoolTaxRateOverflow(uint256 _pid) external view override returns (uint256) {
        if (!_poolInformation[_pid].hasTax) {
            return 0;
        } else {
            if (_poolInformation[_pid].flatTaxRate > 0) {
                return _poolInformation[_pid].flatTaxRate;
            } else {
                return
                    _calculateTaxOverflow(
                        _poolInformation[_pid].totalAmountPool,
                        _poolInformation[_pid].raisingAmountPool
                    );
            }
        }
    }

    /**
     * @notice External view function to see user allocations for both pools
     * @param _user: user address
     * @param _pids[]: array of pids
     * @return
     */
    function viewUserAllocationPools(
        address _user,
        uint8[] calldata _pids
    ) external view override returns (uint256[] memory) {
        uint256[] memory allocationPools = new uint256[](_pids.length);
        for (uint8 i = 0; i < _pids.length; i++) {
            allocationPools[i] = _getUserAllocationPool(_user, _pids[i]);
        }
        return allocationPools;
    }

    /**
     * @notice External view function to see user information
     * @param _user: user address
     * @param _pids[]: array of pids
     */
    function viewUserInfo(
        address _user,
        uint8[] calldata _pids
    ) external view override returns (uint256[] memory, bool[] memory) {
        uint256[] memory amountPools = new uint256[](_pids.length);
        bool[] memory statusPools = new bool[](_pids.length);

        for (uint8 i = 0; i <= MAX_POOL_ID; i++) {
            amountPools[i] = _userInfo[_user][i].amountPool;
            statusPools[i] = _userInfo[_user][i].claimedPool;
        }
        return (amountPools, statusPools);
    }

    /**
     * @notice External view function to see user offering and refunding amounts for both pools
     * @param _user: user address
     * @param _pids: array of pids
     */
    function viewUserOfferingAndRefundingAmountsForPools(
        address _user,
        uint8[] calldata _pids
    ) external view override returns (uint256[3][] memory) {
        uint256[3][] memory amountPools = new uint256[3][](_pids.length);

        for (uint8 i = 0; i < _pids.length; i++) {
            uint256 userOfferingAmountPool;
            uint256 userRefundingAmountPool;
            uint256 userTaxAmountPool;

            if (_poolInformation[_pids[i]].raisingAmountPool > 0) {
                (
                    userOfferingAmountPool,
                    userRefundingAmountPool,
                    userTaxAmountPool
                ) = _calculateOfferingAndRefundingAmountsPool(_user, _pids[i]);
            }

            amountPools[i] = [userOfferingAmountPool, userRefundingAmountPool, userTaxAmountPool];
        }
        return amountPools;
    }

    /**
     * @notice Returns the vesting schedule information of a given holder and index
     * @return The vesting schedule object
     */
    function getVestingScheduleByAddressAndIndex(
        address _holder,
        uint256 _index
    ) external view returns (VestingSchedule memory) {
        return getVestingSchedule(computeVestingScheduleIdForAddressAndIndex(_holder, _index));
    }

    /**
     * @notice Returns the total amount of vesting schedules
     * @return The vesting schedule total amount
     */
    function getVestingSchedulesTotalAmount() external view returns (uint256) {
        return vestingSchedulesTotalAmount;
    }

    /**
     * @notice Release vested amount of offering tokens
     * @param _vestingScheduleId the vesting schedule identifier
     */
    function release(bytes32 _vestingScheduleId) external nonReentrant {
        require(vestingSchedules[_vestingScheduleId].isVestingInitialized == true, 'vesting schedule is not exist');

        VestingSchedule storage vestingSchedule = vestingSchedules[_vestingScheduleId];
        bool isBeneficiary = msg.sender == vestingSchedule.beneficiary;
        bool isOwner = msg.sender == owner();
        require(isBeneficiary || isOwner, 'only the beneficiary and owner can release vested tokens');
        uint256 vestedAmount = _computeReleasableAmount(vestingSchedule);
        require(vestedAmount > 0, 'no vested tokens to release');
        vestingSchedule.released = vestingSchedule.released.add(vestedAmount);
        vestingSchedulesTotalAmount = vestingSchedulesTotalAmount.sub(vestedAmount);
        offeringToken.safeTransfer(vestingSchedule.beneficiary, vestedAmount);

        emit Released(vestingSchedule.beneficiary, vestedAmount);
    }

    /**
     * @notice Revokes all the vesting schedules
     */
    function revoke() external onlyOwner {
        require(!vestingRevoked, 'vesting is revoked');

        vestingRevoked = true;

        emit Revoked();
    }

    /**
     * @notice Returns the number of vesting schedules managed by the contract
     * @return The number of vesting count
     */
    function getVestingSchedulesCount() public view returns (uint256) {
        return vestingSchedulesIds.length;
    }

    /**
     * @notice Returns the vested amount of tokens for the given vesting schedule identifier
     * @return The number of vested count
     */
    function computeReleasableAmount(bytes32 _vestingScheduleId) public view returns (uint256) {
        require(vestingSchedules[_vestingScheduleId].isVestingInitialized == true, 'vesting schedule is not exist');

        VestingSchedule memory vestingSchedule = vestingSchedules[_vestingScheduleId];
        return _computeReleasableAmount(vestingSchedule);
    }

    /**
     * @notice Returns the vesting schedule information of a given identifier
     * @return The vesting schedule object
     */
    function getVestingSchedule(bytes32 _vestingScheduleId) public view returns (VestingSchedule memory) {
        return vestingSchedules[_vestingScheduleId];
    }

    /**
     * @notice Returns the amount of offering token that can be withdrawn by the owner
     * @return The amount of offering token
     */
    function getWithdrawableOfferingTokenAmount() public view returns (uint256) {
        return offeringToken.balanceOf(address(this)).sub(vestingSchedulesTotalAmount);
    }

    /**
     * @notice Computes the next vesting schedule identifier for a given holder address
     * @return The id string
     */
    function computeNextVestingScheduleIdForHolder(address _holder) public view returns (bytes32) {
        return computeVestingScheduleIdForAddressAndIndex(_holder, holdersVestingCount[_holder]);
    }

    /**
     * @notice Computes the next vesting schedule identifier for an address and an index
     * @return The id string
     */
    function computeVestingScheduleIdForAddressAndIndex(address _holder, uint256 _index) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(_holder, _index));
    }

    /**
     * @notice Computes the next vesting schedule identifier for an address and an pid
     * @return The id string
     */
    function computeVestingScheduleIdForAddressAndPid(address _holder, uint256 _pid) external view returns (bytes32) {
        require(_pid <= MAX_POOL_ID, 'ComputeVestingScheduleId: Non valid pool id');
        bytes32 vestingScheduleId = computeVestingScheduleIdForAddressAndIndex(_holder, 0);
        VestingSchedule memory vestingSchedule = vestingSchedules[vestingScheduleId];
        if (vestingSchedule.pid == _pid) {
            return vestingScheduleId;
        } else {
            return computeVestingScheduleIdForAddressAndIndex(_holder, 1);
        }
    }

    /**
     * @notice Computes the releasable amount of tokens for a vesting schedule
     * @return The amount of releasable tokens
     */
    function _computeReleasableAmount(VestingSchedule memory _vestingSchedule) internal view returns (uint256) {
        if (block.timestamp < vestingStartTime + _poolInformation[_vestingSchedule.pid].vestingCliff) {
            return 0;
        } else if (
            block.timestamp >= vestingStartTime.add(_poolInformation[_vestingSchedule.pid].vestingDuration) ||
            vestingRevoked
        ) {
            return _vestingSchedule.amountTotal.sub(_vestingSchedule.released);
        } else {
            uint256 timeFromStart = block.timestamp.sub(vestingStartTime);
            uint256 secondsPerSlice = _poolInformation[_vestingSchedule.pid].vestingSlicePeriodSeconds;
            uint256 vestedSlicePeriods = timeFromStart.div(secondsPerSlice);
            uint256 vestedSeconds = vestedSlicePeriods.mul(secondsPerSlice);
            uint256 vestedAmount = _vestingSchedule.amountTotal.mul(vestedSeconds).div(
                _poolInformation[_vestingSchedule.pid].vestingDuration
            );
            vestedAmount = vestedAmount.sub(_vestingSchedule.released);
            return vestedAmount;
        }
    }

    /**
     * @notice Creates a new vesting schedule for a beneficiary
     * @param _beneficiary address of the beneficiary to whom vested tokens are transferred
     * @param _pid the pool id
     * @param _amount total amount of tokens to be released at the end of the vesting
     */
    function _createVestingSchedule(address _beneficiary, uint8 _pid, uint256 _amount) internal {
        require(
            getWithdrawableOfferingTokenAmount() >= _amount,
            'can not create vesting schedule with sufficient tokens'
        );

        bytes32 vestingScheduleId = computeNextVestingScheduleIdForHolder(_beneficiary);
        require(vestingSchedules[vestingScheduleId].beneficiary == address(0), 'vestingScheduleId is been created');
        vestingSchedules[vestingScheduleId] = VestingSchedule(true, _beneficiary, _pid, _amount, 0);
        vestingSchedulesTotalAmount = vestingSchedulesTotalAmount.add(_amount);
        vestingSchedulesIds.push(vestingScheduleId);
        holdersVestingCount[_beneficiary]++;
    }

    /**
     * @notice It calculates the tax overflow given the raisingAmountPool and the totalAmountPool.
     * @dev 100,000,000,000 means 0.1 (10%) / 1 means 0.0000000000001 (0.0000001%) / 1,000,000,000,000 means 1 (100%)
     * @return It returns the tax percentage
     */
    function _calculateTaxOverflow(
        uint256 _totalAmountPool,
        uint256 _raisingAmountPool
    ) internal pure returns (uint256) {
        uint256 ratioOverflow = _totalAmountPool.div(_raisingAmountPool);
        if (ratioOverflow >= 1500) {
            return 250000000; // 0.0125%
        } else if (ratioOverflow >= 1000) {
            return 500000000; // 0.05%
        } else if (ratioOverflow >= 500) {
            return 1000000000; // 0.1%
        } else if (ratioOverflow >= 250) {
            return 1250000000; // 0.125%
        } else if (ratioOverflow >= 100) {
            return 1500000000; // 0.15%
        } else if (ratioOverflow >= 50) {
            return 2500000000; // 0.25%
        } else {
            return 5000000000; // 0.5%
        }
    }

    /**
     * @notice It calculates the offering amount for a user and the number of LP tokens to transfer back.
     * @param _user: user address
     * @param _pid: pool id
     * @return {uint256, uint256, uint256} It returns the offering amount, the refunding amount (in LP tokens),
     * and the tax (if any, else 0)
     */
    function _calculateOfferingAndRefundingAmountsPool(
        address _user,
        uint8 _pid
    ) internal view returns (uint256, uint256, uint256) {
        uint256 userOfferingAmount;
        uint256 userRefundingAmount;
        uint256 taxAmount;

        if (_poolInformation[_pid].totalAmountPool > _poolInformation[_pid].raisingAmountPool) {
            // Calculate allocation for the user
            uint256 allocation = _getUserAllocationPool(_user, _pid);

            // Calculate the offering amount for the user based on the offeringAmount for the pool
            userOfferingAmount = _poolInformation[_pid].offeringAmountPool.mul(allocation).div(1e12);

            // Calculate the payAmount
            uint256 payAmount = _poolInformation[_pid].raisingAmountPool.mul(allocation).div(1e12);

            // Calculate the pre-tax refunding amount
            userRefundingAmount = _userInfo[_user][_pid].amountPool.sub(payAmount);

            // Retrieve the tax rate
            if (_poolInformation[_pid].hasTax) {
                uint256 flatTaxRate = _poolInformation[_pid].flatTaxRate;
                if (flatTaxRate > 0) {
                    // Calculate the final taxAmount
                    taxAmount = userRefundingAmount.mul(flatTaxRate).div(1e12);

                    // Adjust the refunding amount
                    userRefundingAmount = userRefundingAmount.sub(taxAmount);
                } else {
                    uint256 taxOverflow = _calculateTaxOverflow(
                        _poolInformation[_pid].totalAmountPool,
                        _poolInformation[_pid].raisingAmountPool
                    );

                    // Calculate the final taxAmount
                    taxAmount = userRefundingAmount.mul(taxOverflow).div(1e12);

                    // Adjust the refunding amount
                    userRefundingAmount = userRefundingAmount.sub(taxAmount);
                }
            }
        } else {
            userRefundingAmount = 0;
            taxAmount = 0;
            // _userInfo[_user] / (raisingAmount / offeringAmount)
            userOfferingAmount = _userInfo[_user][_pid].amountPool.mul(_poolInformation[_pid].offeringAmountPool).div(
                _poolInformation[_pid].raisingAmountPool
            );
        }
        return (userOfferingAmount, userRefundingAmount, taxAmount);
    }

    /**
     * @notice It returns the user allocation for pool
     * @dev 100,000,000,000 means 0.1 (10%) / 1 means 0.0000000000001 (0.0000001%) / 1,000,000,000,000 means 1 (100%)
     * @param _user: user address
     * @param _pid: pool id
     * @return It returns the user's share of pool
     */
    function _getUserAllocationPool(address _user, uint8 _pid) internal view returns (uint256) {
        if (_pid > MAX_POOL_ID) {
            return 0;
        }

        if (_poolInformation[_pid].totalAmountPool > 0) {
            return _userInfo[_user][_pid].amountPool.mul(1e18).div(_poolInformation[_pid].totalAmountPool.mul(1e6));
        } else {
            return 0;
        }
    }

    /**
     * @notice Check if an address is a contract
     */
    function _isContract(address _addr) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(_addr)
        }
        return size > 0;
    }

    function isQualifiedWhitelist(address _user) public view returns (bool) {
        return isWhitelisted(_user);
    }
}
