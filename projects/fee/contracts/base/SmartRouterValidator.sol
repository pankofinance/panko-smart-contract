// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import '../interfaces/ISmartRouter.sol';
import '../libraries/Path.sol';

library SmartRouterConstants {
    uint256 internal constant CONTRACT_BALANCE = 0;
    address internal constant MSG_SENDER = address(1);
    address internal constant ADDRESS_THIS = address(2);
}

interface ISmartRouterValidator {
    error InvalidSwapSignature(bytes4 data);
    error InvalidDestination(address dst);
    error InvalidRecipient(address recipient);

    function validDestinationTokens(address) external view returns (bool);
}

abstract contract SmartRouterValidator is ISmartRouterValidator {
    using Path for bytes;

    mapping(address => bool) public validDestinationTokens;

    function _validateSwapInfo(bytes calldata swapData) internal view {
        (bytes4 sig, bytes memory data) = _extractFunctionCalldata(swapData);
        if (sig == IV2SwapRouter.swapExactTokensForTokens.selector) {
            _validateSwapV2ExactInput(data);
        } else if (sig == IV2SwapRouter.swapTokensForExactTokens.selector) {
            _validateSwapV2ExactOutput(data);
        } else if (sig == IStableSwapRouter.exactInputStableSwap.selector) {
            _validateSwapStableExactInput(data);
        } else if (sig == IStableSwapRouter.exactOutputStableSwap.selector) {
            _validateSwapStableExactOutput(data);
        } else if (sig == IV3SwapRouter.exactInputSingle.selector) {
            _validateSwapV3ExactInputSingle(data);
        } else if (sig == IV3SwapRouter.exactInput.selector) {
            _validateSwapV3ExactInput(data);
        } else if (sig == IV3SwapRouter.exactOutputSingle.selector) {
            _validateSwapV3ExactOutputSingle(data);
        } else if (sig == IV3SwapRouter.exactOutput.selector) {
            _validateSwapV3ExactOutput(data);
        } else {
            revert InvalidSwapSignature(sig);
        }
    }

    function _extractFunctionCalldata(bytes calldata payload) internal pure returns (bytes4 sig, bytes memory data) {
        sig = payload[0] | (bytes4(payload[1]) >> 8) | (bytes4(payload[2]) >> 16) | (bytes4(payload[3]) >> 24);
        data = payload[4:];
    }

    function _validateSwapV2ExactInput(bytes memory data) internal view returns (bytes memory) {
        (uint256 amountIn, uint256 amountOutMin, address[] memory path, address to) = abi.decode(
            data,
            (uint256, uint256, address[], address)
        );
        if (to != SmartRouterConstants.MSG_SENDER && to != SmartRouterConstants.ADDRESS_THIS) {
            revert InvalidRecipient(to);
        }
        if (to == SmartRouterConstants.MSG_SENDER && !validDestinationTokens[path[path.length - 1]]) {
            revert InvalidDestination(path[path.length - 1]);
        }
        return abi.encodeCall(IV2SwapRouter.swapExactTokensForTokens, (amountIn, amountOutMin, path, to));
    }

    function _validateSwapV2ExactOutput(bytes memory data) internal view returns (bytes memory) {
        (uint256 amountOut, uint256 amountInMax, address[] memory path, address to) = abi.decode(
            data,
            (uint256, uint256, address[], address)
        );
        if (to != SmartRouterConstants.MSG_SENDER && to != SmartRouterConstants.ADDRESS_THIS) {
            revert InvalidRecipient(to);
        }
        if (to == SmartRouterConstants.MSG_SENDER && !validDestinationTokens[path[path.length - 1]]) {
            revert InvalidDestination(path[path.length - 1]);
        }
        return abi.encodeCall(IV2SwapRouter.swapTokensForExactTokens, (amountOut, amountInMax, path, to));
    }

    function _validateSwapStableExactInput(bytes memory data) internal view returns (bytes memory) {
        (address[] memory path, uint256[] memory flag, uint256 amountIn, uint256 amountOutMin, address to) = abi.decode(
            data,
            (address[], uint256[], uint256, uint256, address)
        );
        if (to != SmartRouterConstants.MSG_SENDER && to != SmartRouterConstants.ADDRESS_THIS) {
            revert InvalidRecipient(to);
        }
        if (to == SmartRouterConstants.MSG_SENDER && !validDestinationTokens[path[path.length - 1]]) {
            revert InvalidDestination(path[path.length - 1]);
        }
        return abi.encodeCall(IStableSwapRouter.exactInputStableSwap, (path, flag, amountIn, amountOutMin, to));
    }

    function _validateSwapStableExactOutput(bytes memory data) internal view returns (bytes memory) {
        (address[] memory path, uint256[] memory flag, uint256 amountOut, uint256 amountInMax, address to) = abi.decode(
            data,
            (address[], uint256[], uint256, uint256, address)
        );
        if (to != SmartRouterConstants.MSG_SENDER && to != SmartRouterConstants.ADDRESS_THIS) {
            revert InvalidRecipient(to);
        }
        if (to == SmartRouterConstants.MSG_SENDER && !validDestinationTokens[path[path.length - 1]]) {
            revert InvalidDestination(path[path.length - 1]);
        }
        return abi.encodeCall(IStableSwapRouter.exactOutputStableSwap, (path, flag, amountOut, amountInMax, to));
    }

    function _validateSwapV3ExactInputSingle(bytes memory data) internal view returns (bytes memory) {
        IV3SwapRouter.V3ExactInputSingleParams memory params = abi.decode(
            data,
            (IV3SwapRouter.V3ExactInputSingleParams)
        );
        if (
            params.recipient != SmartRouterConstants.MSG_SENDER && params.recipient != SmartRouterConstants.ADDRESS_THIS
        ) {
            revert InvalidRecipient(params.recipient);
        }
        if (params.recipient == SmartRouterConstants.MSG_SENDER && !validDestinationTokens[params.tokenOut]) {
            revert InvalidDestination(params.tokenOut);
        }
        return abi.encodeCall(IV3SwapRouter.exactInputSingle, (params));
    }

    function _validateSwapV3ExactInput(bytes memory data) internal view returns (bytes memory) {
        IV3SwapRouter.V3ExactInputParams memory params = abi.decode(data, (IV3SwapRouter.V3ExactInputParams));
        if (
            params.recipient != SmartRouterConstants.MSG_SENDER && params.recipient != SmartRouterConstants.ADDRESS_THIS
        ) {
            revert InvalidRecipient(params.recipient);
        }
        (, address tokenOut, ) = params.path.decodeLastPool();
        if (params.recipient == SmartRouterConstants.MSG_SENDER && !validDestinationTokens[tokenOut]) {
            revert InvalidDestination(tokenOut);
        }
        return abi.encodeCall(IV3SwapRouter.exactInput, (params));
    }

    function _validateSwapV3ExactOutputSingle(bytes memory data) internal view returns (bytes memory) {
        IV3SwapRouter.V3ExactOutputSingleParams memory params = abi.decode(
            data,
            (IV3SwapRouter.V3ExactOutputSingleParams)
        );
        if (
            params.recipient != SmartRouterConstants.MSG_SENDER && params.recipient != SmartRouterConstants.ADDRESS_THIS
        ) {
            revert InvalidRecipient(params.recipient);
        }
        if (params.recipient == SmartRouterConstants.MSG_SENDER && !validDestinationTokens[params.tokenOut]) {
            revert InvalidDestination(params.tokenOut);
        }
        return abi.encodeCall(IV3SwapRouter.exactOutputSingle, (params));
    }

    function _validateSwapV3ExactOutput(bytes memory data) internal view returns (bytes memory) {
        IV3SwapRouter.V3ExactOutputParams memory params = abi.decode(data, (IV3SwapRouter.V3ExactOutputParams));
        if (
            params.recipient != SmartRouterConstants.MSG_SENDER && params.recipient != SmartRouterConstants.ADDRESS_THIS
        ) {
            revert InvalidRecipient(params.recipient);
        }
        (, address tokenOut, ) = params.path.decodeLastPool();
        if (params.recipient == SmartRouterConstants.MSG_SENDER && !validDestinationTokens[tokenOut]) {
            revert InvalidDestination(tokenOut);
        }
        return abi.encodeCall(IV3SwapRouter.exactOutput, (params));
    }
}
