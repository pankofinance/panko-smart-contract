// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import './base/SmartRouterValidator.sol';
import './base/Multicall.sol';

import './interfaces/IFeeHandler.sol';
import './interfaces/IPancakeV3Factory.sol';
import './interfaces/IPancakeV3Pool.sol';
import './interfaces/ISmartRouter.sol';
import './interfaces/IStableSwapPool.sol';
import './interfaces/IOwnable.sol';

contract FeeHandler is IFeeHandler, UUPSUpgradeable, OwnableUpgradeable, SmartRouterValidator {
    using SafeERC20 for IERC20;

    address constant ETHER_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    address public smartRouter;
    address public v3Factory;

    mapping(address => bool) public operators;

    /**
     * Modifiers
     */

    modifier onlyOperatorOrOwner() {
        if (operators[msg.sender] || owner() == msg.sender) {
            _;
        } else {
            revert NotOperatorOrOwner();
        }
    }

    /**
     * Initializing
     */

    constructor() {}

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function initialize(
        address _smartRouter,
        address _v3Factory,
        address[] memory _operators,
        address[] memory _validDestinationTokens
    ) external initializer {
        __UUPSUpgradeable_init();
        __Ownable_init();
        smartRouter = _smartRouter;
        v3Factory = _v3Factory;
        for (uint256 i = 0; i < _operators.length; i++) {
            operators[_operators[i]] = true;
        }
        for (uint256 i = 0; i < _validDestinationTokens.length; i++) {
            validDestinationTokens[_validDestinationTokens[i]] = true;
        }
    }

    /**
     * Configuring
     */

    function setValidDestinationToken(address _token, bool _isValid) external onlyOwner {
        validDestinationTokens[_token] = _isValid;
    }

    function setOperator(address _operator, bool _isOperator) external onlyOwner {
        operators[_operator] = _isOperator;
    }

    function setRouter(address _router) external onlyOwner {
        smartRouter = _router;
    }

    function transferOwnershipOf(address _target, address _newOwner) external onlyOwner {
        IOwnable(_target).transferOwnership(_newOwner);
    }

    function setOwnerOf(address _target, address _newOwner) external onlyOwner {
        IOwnableSet(_target).setOwner(_newOwner);
    }

    /**
     * Collecting Fees
     */

    function collectFeeV3(address[] memory _pools) external onlyOperatorOrOwner {
        for (uint256 i = 0; i < _pools.length; i++) {
            _collectFeeV3(_pools[i], address(this));
        }
    }

    function _collectFeeV3(address _pool, address _recipient) internal {
        IPancakeV3Factory factory = IPancakeV3Factory(v3Factory);
        factory.collectProtocol(
            _pool,
            _recipient == address(0) ? address(this) : _recipient,
            type(uint128).max,
            type(uint128).max
        );
    }

    function collectFeeStableSwap(address[] calldata _pools) external onlyOperatorOrOwner {
        for (uint256 i = 0; i < _pools.length; i++) {
            _collectFeeStableSwap(_pools[i], address(this));
        }
    }

    function _collectFeeStableSwap(address _pool, address _recipient) internal {
        IStableSwapPool pool = IStableSwapPool(_pool);
        pool.withdraw_admin_fees();
        if (_recipient != address(this) && _recipient != address(0)) {
            uint256 ncoins = pool.N_COINS();
            for (uint256 i = 0; i < ncoins; i++) {
                IERC20 coin = IERC20(pool.coins(i));
                if (ETHER_ADDRESS == address(coin)) {
                    payable(_recipient).transfer(address(this).balance);
                } else {
                    coin.safeTransfer(_recipient, coin.balanceOf(address(this)));
                }
            }
        }
    }

    /**
     * Withdraw Fees
     */

    function withdraw(address _token, address _to) external onlyOwner {
        _transferOut(_token, _to);
    }

    function withdrawMultiple(address[] calldata _tokens, address _to) external onlyOwner {
        for (uint256 i = 0; i < _tokens.length; i++) {
            _transferOut(_tokens[i], _to);
        }
    }

    /**
     * Swap
     */

    function swapSmart(
        uint256 _deadline,
        address[] calldata _srcTokens,
        bytes[] calldata _swapMulticallData
    ) external onlyOperatorOrOwner {
        if (_deadline < block.timestamp) {
            revert DeadlinePassed();
        }
        for (uint256 i = 0; i < _swapMulticallData.length; i++) {
            _validateSwapInfo(_swapMulticallData[i]);
        }
        for (uint256 i = 0; i < _srcTokens.length; i++) {
            _increaseAllowance(_srcTokens[i], smartRouter, type(uint256).max);
        }
        try ISmartRouter(smartRouter).multicall(_deadline, _swapMulticallData) {
            emit Swapped();
        } catch {
            revert SwapFailed();
        }
    }

    /**
     * Utilities
     */

    function _increaseAllowance(address _token, address _spender, uint256 _value) internal {
        uint256 currentAllowance = IERC20(_token).allowance(address(this), _spender);
        if (currentAllowance < _value) {
            IERC20(_token).safeIncreaseAllowance(_spender, type(uint256).max - currentAllowance);
        }
    }

    function _transferOut(address _token, address _to) internal {
        if (_to == address(this)) return;
        if (_token == ETHER_ADDRESS) {
            payable(_to).transfer(address(this).balance);
        } else {
            IERC20(_token).safeTransfer(_to, IERC20(_token).balanceOf(address(this)));
        }
    }
}
