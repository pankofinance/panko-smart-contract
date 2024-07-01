// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

interface IFeeHandler {
    error DeadlinePassed();
    error NotOperatorOrOwner();
    error SwapFailed();

    event Swapped();

    function collectFeeV3(address[] memory _pools) external;

    function collectFeeStableSwap(address[] calldata _pools) external;

    function withdraw(address _token, address _to) external;

    function withdrawMultiple(address[] calldata _tokens, address _to) external;

    function swapSmart(uint256 deadline, address[] calldata _srcTokens, bytes[] calldata swapMulticallData) external;
}
