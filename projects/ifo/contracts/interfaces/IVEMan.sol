// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IVEMan {
    function getUserInfo(
        address _user
    )
        external
        view
        returns (
            int128 amount,
            uint256 end,
            address cakePoolProxy,
            uint128 cakeAmount,
            uint48 lockEndTime,
            uint48 migrationTime,
            uint16 cakePoolType,
            uint16 withdrawFlag
        );

    function balanceOfAtTime(address _user, uint256 _timestamp) external view returns (uint256);
}
