// SPDX-License-Identifier: MIT

pragma solidity ^0.8.22;

import { MessagingFee, MessagingReceipt } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { MessagingParams } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { SafeERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";
import { SendParam } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

/**
 * @notice THIS IS AN EXAMPLE CONTRACT. DO NOT USE THIS CODE IN PRODUCTION.
 */
contract Source is OFT {
    using OptionsBuilder for bytes;
    using SafeERC20 for IERC20;

    error LzAltTokenUnavailable();

    struct DocInfo {
        address prover;
        bytes docHash;
        bytes signedHash;
        bytes publicInput;
        bytes verificationKey;
        bytes proof;
        uint40 timestamp;
    }

    mapping(bytes32 hashKey => DocInfo docInfo) public docInfos;

    address public issuer;
    uint256 public tokenReward;

    event DocIssued(
        bytes32 indexed hashKey,
        address prover,
        bytes docHash,
        bytes signedHash,
        bytes publicInput,
        bytes verificationKey
    );

    event DocProofUpdated(bytes32 indexed hashKey, bytes proof);

    error Source__OnlyIssuer();
    error Source__IncorrectProver();

    modifier onlyIssuer() {
        if (msg.sender != issuer) {
            revert Source__OnlyIssuer();
        }
        _;
    }

    /// The `_options` variable is typically provided as an argument to both the `_quote` and `_lzSend` functions.
    /// In this example, we demonstrate how to generate the `bytes` value for `_options` and pass it manually.
    /// The `OptionsBuilder` is used to create new options and add an executor option for `LzReceive` with specified
    /// parameters.
    /// An off-chain equivalent can be found under 'Message Execution Options' in the LayerZero V2 Documentation.
    // bytes _options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(50000, 0);

    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate,
        address _issuer
    )
        OFT(_name, _symbol, _lzEndpoint, _delegate)
        Ownable(_delegate)
    {
        issuer = _issuer;
    }

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

    function setIssuer(address _issuer) public onlyOwner {
        issuer = _issuer;
    }

    // we can encode the receiver, prover, and verifier in the message
    function issueDoc(
        address _prover,
        uint40 _timestamp,
        bytes calldata _docHash,
        bytes calldata _signedHash,
        bytes calldata _publicInput,
        bytes calldata _verificationKey,
        SendParam calldata _sendParam,
        MessagingFee calldata _fee,
        address _refundAddress
    )
        external
        onlyIssuer
    {
        bytes32 _hashKey = keccak256(_docHash);

        DocInfo memory _docInfo = DocInfo({
            prover: _prover,
            docHash: _docHash,
            signedHash: _signedHash,
            publicInput: _publicInput,
            verificationKey: _verificationKey,
            proof: "", // Will be stored later by the prover
            timestamp: _timestamp
        });

        docInfos[_hashKey] = _docInfo;

        _send(_sendParam, _fee, _refundAddress);

        // Emit an event to notify the client that the document has been issued.
        emit DocIssued(_hashKey, _prover, _docHash, _signedHash, _publicInput, _verificationKey);
    }

    function setProof(bytes32 _hashKey, bytes calldata _proof, uint40 _timestamp) external {
        if (msg.sender != docInfos[_hashKey].prover) {
            revert Source__IncorrectProver();
        }
        DocInfo storage _docInfo = docInfos[_hashKey];
        _docInfo.proof = _proof;
        _docInfo.timestamp = _timestamp;

        emit DocProofUpdated(_hashKey, _proof);
    }

    function mint(address _to, uint256 _amount) public {
        _mint(_to, _amount);
    }

    function _lzSend(
        uint32 _dstEid,
        bytes memory _message,
        bytes memory _options,
        MessagingFee memory _fee,
        address _refundAddress
    )
        internal
        virtual
        override
        returns (MessagingReceipt memory receipt)
    {
        // @dev Push corresponding fees to the endpoint, any excess is sent back to the _refundAddress from the
        // endpoint.
        _payNative(_fee.nativeFee);
        if (_fee.lzTokenFee > 0) _payLzToken(_fee.lzTokenFee);

        return endpoint
            // solhint-disable-next-line check-send-result
            .send(
            MessagingParams(_dstEid, _getPeerOrRevert(_dstEid), _message, _options, _fee.lzTokenFee > 0), _refundAddress
        );
    }

    function _payNative(uint256 _nativeFee) internal virtual override returns (uint256 nativeFee) {
        address nativeErc20 = endpoint.nativeToken();
        if (nativeErc20 == address(0)) revert LzAltTokenUnavailable();

        // Pay Alt token fee by sending tokens to the endpoint.
        IERC20(nativeErc20).safeTransferFrom(msg.sender, address(endpoint), _nativeFee);
    }
}
