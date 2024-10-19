// SPDX-License-Identifier: MIT

pragma solidity ^0.8.22;

import { OApp, MessagingFee, Origin, MessagingReceipt } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

/**
 * @notice THIS IS AN EXAMPLE CONTRACT. DO NOT USE THIS CODE IN PRODUCTION.
 */
contract Source is OApp {
    using OptionsBuilder for bytes;

    mapping(address receiver => uint256 amount) public accounting;

    mapping(bytes32 guid => bool processed) public inboundGUIDs;
    mapping(bytes32 guid => bool processed) public outboundGUIDs;

    event MessageSent(bytes message, uint32 dstEid, bytes32 guid);
    event MessageResolved(bytes32 guid, address receiver, uint256 amount);

    error Source__MessageAlreadyProcessed();
    error Source__InvalidAccountingForReceiver();
    error Source__UnknownGUID();

    /// The `_options` variable is typically provided as an argument to both the `_quote` and `_lzSend` functions.
    /// In this example, we demonstrate how to generate the `bytes` value for `_options` and pass it manually.
    /// The `OptionsBuilder` is used to create new options and add an executor option for `LzReceive` with specified
    /// parameters.
    /// An off-chain equivalent can be found under 'Message Execution Options' in the LayerZero V2 Documentation.
    // bytes _options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(50000, 0);

    /**
     * @notice Initializes the OApp with the source chain's endpoint address.
     * @param _endpoint The endpoint address.
     */
    constructor(address _endpoint, address _owner) OApp(_endpoint, _owner) Ownable(_owner) { }

    /**
     * @dev Converts an address to bytes32.
     * @param _addr The address to convert.
     * @return The bytes32 representation of the address.
     */
    function addressToBytes32(address _addr) public pure returns (bytes32) {
        return bytes32(uint256(uint160(_addr)));
    }

    /**
     * @dev Converts bytes32 to an address.
     * @param _b The bytes32 value to convert.
     * @return The address representation of bytes32.
     */
    function bytes32ToAddress(bytes32 _b) public pure returns (address) {
        return address(uint160(uint256(_b)));
    }

    function encodeMessage(address _receiver, uint256 _amount) public pure returns (bytes memory) {
        return abi.encode(_receiver, _amount);
    }

    function decodeMessage(bytes memory _encodedMessage) public pure returns (address _receiver, uint256 _amount) {
        return abi.decode(_encodedMessage, (address, uint256));
    }

    /**
     * @notice Quotes the gas needed to pay for the full omnichain transaction in native gas or ZRO token.
     * @param _dstEid Destination chain's endpoint ID.
     * @param _encodedMessage The encoded message.
     * @param _options Message execution options (e.g., for sending gas to destination).
     * @param _payInLzToken Whether to return fee in ZRO token.
     * @return fee A `MessagingFee` struct containing the calculated gas fee in either the native token or ZRO token.
     */
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

    /**
     * @dev Sends a message from the source to destination chain.
     *      Encodes the message as bytes and sends it using the `_lzSend` internal function.
     * @notice see your LayerZero transaction by pasting the hash in https://testnet.layerzeroscan.com/
     * @param _dstEid The endpoint ID of the destination chain.
     * @param _encodedMessage The encoded message to be sent.
     * @param _options Additional options for message execution.
     * @return receipt A `MessagingReceipt` struct containing details of the message sent.
     */
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
        (address _receiver, uint256 _amount) = abi.decode(_encodedMessage, (address, uint256));

        receipt = _lzSend(
            _dstEid,
            _encodedMessage,
            _options,
            // Fee in native gas and ZRO token.
            MessagingFee(msg.value, 0),
            // Refund address in case of failed source message.
            payable(msg.sender)
        );

        outboundGUIDs[receipt.guid] = true;
        accounting[_receiver] += _amount;

        emit MessageSent(_encodedMessage, _dstEid, receipt.guid);
    }

    function _lzReceive(
        Origin calldata, /*_origin*/
        bytes32 _guid,
        bytes calldata _payload,
        address, /*_executor*/
        bytes calldata /*_extraData*/
    )
        internal
        override
    {
        (bytes32 _unProcessedGuid, address _receiver, uint256 _amount) =
            abi.decode(_payload, (bytes32, address, uint256));

        if (!outboundGUIDs[_unProcessedGuid]) {
            revert Source__UnknownGUID();
        }

        if (accounting[_receiver] < _amount) {
            revert Source__InvalidAccountingForReceiver();
        }

        // have a strict check according to the receiver in production
        accounting[_receiver] -= _amount;

        inboundGUIDs[_guid] = true;

        emit MessageResolved(_guid, _receiver, _amount);
    }
}
