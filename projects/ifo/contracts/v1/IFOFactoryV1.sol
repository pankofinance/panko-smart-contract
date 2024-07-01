// SPDX-License-Identifier: MIT
pragma solidity =0.8.26;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

import './intefaces/IIFOFactoryV1.sol';
import './IFOInitializableV1.sol';

/**
 * @title IFOFactoryV1
 */
contract IFOFactoryV1 is IIFOFactoryV1, Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_BUFFER_SECONDS = 86400 * 7; // (7 days on BSC)

    address public currIFOAddress;

    address public weth;

    address public privateSignerAddress;

    event AdminTokenRecovery(address indexed tokenRecovered, uint256 amount);
    event NewIFOContract(address indexed ifoAddress);
    event NewPrivateSignerAddress(address oldSigner, address newSigner);

    constructor(address _weth) {
        weth = _weth;
    }

    function setPrivateSignerAddress(address _privateSignerAddress) external onlyOwner {
        emit NewPrivateSignerAddress(privateSignerAddress, _privateSignerAddress);
        privateSignerAddress = _privateSignerAddress;
    }

    /**
     * @notice It creates the IFO contract and initializes the contract.
     * @param _quoteToken: the quote token used
     * @param _offeringToken: the token that is offered for the IFO
     * @param _startTimestamp: the start timestamp for the IFO
     * @param _endTimestamp: the end timestamp for the IFO
     * @param _maxPoolId: maximum id of pools, sometimes only public sale exist
     * @param _adminAddress: the admin address for handling tokens
     */
    function createIFO(
        address _quoteToken,
        address _offeringToken,
        uint256 _startTimestamp,
        uint256 _endTimestamp,
        uint8 _maxPoolId,
        address _adminAddress
    ) external onlyOwner {
        if (_quoteToken != address(0)) {
            require(IERC20(_quoteToken).totalSupply() >= 0);
        }
        require(IERC20(_offeringToken).totalSupply() >= 0);
        require(_quoteToken != _offeringToken, 'Operations: Tokens must be be different');
        require(_endTimestamp < (block.timestamp + MAX_BUFFER_SECONDS), 'Operations: End timestamp too far');
        require(_startTimestamp < _endTimestamp, 'Operations: Start timestamp must be inferior to end timestamp');
        require(_startTimestamp > block.timestamp, 'Operations: Start timestamp must be greater than current block');

        bytes memory bytecode = type(IFOInitializableV1).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(_quoteToken, _offeringToken, _startTimestamp));
        address ifoAddress;

        assembly {
            ifoAddress := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }

        IFOInitializableV1(ifoAddress).initialize(
            _quoteToken,
            _offeringToken,
            _startTimestamp,
            _endTimestamp,
            MAX_BUFFER_SECONDS,
            _maxPoolId,
            _adminAddress
        );

        if (currIFOAddress != ifoAddress) {
            currIFOAddress = ifoAddress;
        }

        emit NewIFOContract(ifoAddress);
    }

    /**
     * @notice It allows the admin to recover wrong tokens sent to the contract
     * @param _tokenAddress: the address of the token to withdraw
     * @dev This function is only callable by admin.
     */
    function recoverWrongTokens(address _tokenAddress) external onlyOwner {
        uint256 balanceToRecover = IERC20(_tokenAddress).balanceOf(address(this));
        require(balanceToRecover > 0, 'Operations: Balance must be > 0');
        IERC20(_tokenAddress).safeTransfer(address(msg.sender), balanceToRecover);

        emit AdminTokenRecovery(_tokenAddress, balanceToRecover);
    }
}
