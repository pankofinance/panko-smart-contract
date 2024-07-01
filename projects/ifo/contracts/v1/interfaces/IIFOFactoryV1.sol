// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/** @title IIFOFactoryV1.
 * @notice It is an interface for IFOFactoryV1.sol
 */
interface IIFOFactoryV1 {
    function privateSignerAddress() external view returns (address);
}
