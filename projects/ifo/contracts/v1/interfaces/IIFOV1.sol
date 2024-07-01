// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/** @title IIFOV1.
 * @notice It is an interface for IFOV1.sol
 */
interface IIFOV1 {
    enum SaleType {
        PUBLIC, //0
        PRIVATE //1
    }

    function depositPool(uint256 _amount, uint8 _pid) external payable;

    function depositPrivatePool(uint256 _amount, uint8 _pid, bytes memory _sig) external payable;

    function harvestPool(uint8 _pid) external payable;

    function finalWithdraw(uint256 _lpAmount, uint256 _offerAmount) external;

    function setPool(
        uint256 _offeringAmountPool,
        uint256 _raisingAmountPool,
        uint256 _limitUserInQuote,
        bool _hasTax,
        uint256 _flatTaxRate,
        uint8 _pid,
        SaleType _saleType,
        uint256 _vestingPercentage,
        uint256 _vestingCliff,
        uint256 _vestingDuration,
        uint256 _vestingSlicePeriodSeconds
    ) external;

    function viewPoolInformation(
        uint256 _pid
    ) external view returns (uint256, uint256, uint256, bool, uint256, uint256, SaleType);

    function viewPoolVestingInformation(uint256 _pid) external view returns (uint256, uint256, uint256, uint256);

    function viewPoolTaxRateOverflow(uint256 _pid) external view returns (uint256);

    function viewUserAllocationPools(address _user, uint8[] calldata _pids) external view returns (uint256[] memory);

    function viewUserInfo(
        address _user,
        uint8[] calldata _pids
    ) external view returns (uint256[] memory, bool[] memory);

    function viewUserOfferingAndRefundingAmountsForPools(
        address _user,
        uint8[] calldata _pids
    ) external view returns (uint256[3][] memory);
}
