// SPDX-License-Identifier: MIT

pragma solidity ^0.8.22;

import { OApp, MessagingFee, Origin, MessagingReceipt } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @notice THIS IS AN EXAMPLE CONTRACT. DO NOT USE THIS CODE IN PRODUCTION.
 */
contract Destination is OApp {
    IERC20 public token;

    mapping(bytes32 guid => bool processed) public outboundGUIDs;
    mapping(bytes32 guid => bool processed) public inboundGUIDs;
    mapping(bytes32 guid => bool processed) public resolvedGUIDs;
    mapping(address user => bool claimed) public claimed;

    // /// @notice Emitted when a message is received through _lzReceive.
    // /// @param message The content of the received message.
    // /// @param senderEid What LayerZero Endpoint sent the message.
    // /// @param sender The sending OApp's address.
    // /// @param nonce The nonce of the message.
    event MessageReceived(address receiver, uint256 amount, uint32 senderEid, bytes32 sender, uint64 nonce);
    event MessageResolveSent(bytes32 guid, address receiver, uint256 amount);

    error Destination__TokenReceiverZeroAddress();
    error Destination__InsufficientTokenBalance();
    error Destination__TokenTransferFailed();
    error Destination__MessageAlreadyProcessed();

    /**
     * @notice Initializes the OApp with the source chain's endpoint address.
     * @param _endpoint The endpoint address.
     */
    constructor(address _endpoint, address _owner, IERC20 _token) OApp(_endpoint, _owner) Ownable(_owner) {
        token = _token;
    }

    function encodeMessage(address _receiver, uint256 _amount) public pure returns (bytes memory) {
        return abi.encode(_receiver, _amount);
    }

    function decodeMessage(bytes memory _encodedMessage) public pure returns (address _receiver, uint256 _amount) {
        return abi.decode(_encodedMessage, (address, uint256));
    }

    function encodeResolveMessage(
        bytes32 _guid,
        address _receiver,
        uint256 _amount
    )
        public
        pure
        returns (bytes memory)
    {
        return abi.encode(_guid, _receiver, _amount);
    }

    function decodeResolveMessage(bytes memory _encodedMessage)
        public
        pure
        returns (bytes32 _guid, address _receiver, uint256 _amount)
    {
        return abi.decode(_encodedMessage, (bytes32, address, uint256));
    }

    function setToken(IERC20 _token) external onlyOwner {
        token = _token;
    }

    /**
     * @dev Called when the Executor executes EndpointV2.lzReceive. It overrides the equivalent function in the parent
     * OApp contract.
     * Protocol messages are defined as packets, comprised of the following parameters. Internal function override to
     * handle incoming messages from another chain.
     * @param _origin A struct containing information about where the packet came from.
     * _guid A global unique identifier for tracking the packet.
     * @param message Encoded message.
     * _executor The address of the Executor responsible for processing the message.
     * _extraData Arbitrary data appended by the Executor to the message.
     */
    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata message,
        address, /*executor*/ // Executor address as specified by the OApp.
        bytes calldata /*_extraData*/ // Any extra data or options to trigger on receipt.
    )
        internal
        override
    {
        // Decode the payload to get the message values
        (address receiver, uint256 amount) = decodeMessage(message);

        // check if the receiver is zero address
        if (receiver == address(0)) {
            revert Destination__TokenReceiverZeroAddress();
        }

        // Check if the sender has enough balance
        if (token.balanceOf(address(this)) < amount) {
            revert Destination__InsufficientTokenBalance();
        }

        claimed[receiver] = true;
        inboundGUIDs[_guid] = true;

        // Transfer the tokens to the receiver
        bool success = token.transfer(receiver, amount);
        if (!success) {
            revert Destination__TokenTransferFailed();
        }

        // Emit the event with the decoded message and sender's EID
        emit MessageReceived(receiver, amount, _origin.srcEid, _origin.sender, _origin.nonce);
    }

    function quote(
        uint32 _dstEid,
        bytes memory _encodedMessage,
        bytes memory _options,
        bool _payInLzToken
    )
        public
        view
        returns (MessagingFee memory fee)
    {
        fee = _quote(_dstEid, _encodedMessage, _options, _payInLzToken);
    }

    // a retry mechanism
    function send(
        uint32 _dstEid,
        bytes memory _encodedMessage,
        bytes calldata _options
    )
        external
        payable
        returns (MessagingReceipt memory receipt)
    {
        // Encodes the message before invoking _lzSend.
        // we assume the receiver and amount are valid just for testing purposes.
        (bytes32 _unProcessedSourceGuid, address _receiver, uint256 _amount) = decodeResolveMessage(_encodedMessage);

        if (claimed[_receiver]) {
            revert Destination__MessageAlreadyProcessed();
        }

        if (resolvedGUIDs[_unProcessedSourceGuid] || inboundGUIDs[_unProcessedSourceGuid]) {
            revert Destination__MessageAlreadyProcessed();
        }

        receipt = _lzSend(
            _dstEid,
            _encodedMessage,
            _options,
            // Fee in native gas and ZRO token.
            MessagingFee(msg.value, 0),
            // Refund address in case of failed source message.
            payable(msg.sender)
        );

        resolvedGUIDs[_unProcessedSourceGuid] = true;
        outboundGUIDs[receipt.guid] = true;

        emit MessageResolveSent(receipt.guid, _receiver, _amount);
    }
}
