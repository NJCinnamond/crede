// SPDX-License-Identifier: MIT

pragma solidity ^0.8.22;

import { MessagingFee, MessagingReceipt } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { MessagingParams } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { SafeERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";
import { SendParam, OFTReceipt } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { Verifier } from "./Verifier.sol";

contract Source is OFT, Verifier {
    using OptionsBuilder for bytes;
    using SafeERC20 for IERC20;

    error LzAltTokenUnavailable();

    struct DocInfo {
        address prover;
        uint40 timestamp;
        bytes signedHash;
        bytes proof;
    }

    mapping(bytes32 docKeyHash => DocInfo docInfo) public docInfos;

    address public issuer;
    uint256 public tokenReward;

    event DocIssued(bytes32 indexed docKeyHash, address prover, bytes signedHash);

    event DocProofUpdated(bytes32 indexed docKeyHash, bytes proof, uint40 timestamp);

    error Source__OnlyIssuer();
    error Source__IncorrectProver();
    error Source__OnlyIssuerCanReceiveTokens();
    error Source__InvalidTokenRewardRequested();

    modifier onlyIssuer() {
        if (msg.sender != issuer) {
            revert Source__OnlyIssuer();
        }
        _;
    }

    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate,
        address _issuer,
        uint256 _initialTokenReward
    )
        OFT(_name, _symbol, _lzEndpoint, _delegate)
        Ownable(_delegate)
    {
        issuer = _issuer;
        tokenReward = _initialTokenReward;
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

    function issueDoc(
        address _prover,
        bytes32 _docKeyHash,
        bytes calldata _signedHash,
        SendParam calldata _sendParam,
        MessagingFee calldata _fee
    )
        external
        payable
        onlyIssuer
    {
        if (_sendParam.to != addressToBytes32(issuer)) {
            revert Source__OnlyIssuerCanReceiveTokens();
        }

        if (_sendParam.amountLD > tokenReward) {
            revert Source__InvalidTokenRewardRequested();
        }

        DocInfo memory _docInfo = DocInfo({
            prover: _prover,
            signedHash: _signedHash,
            proof: "", // Will be stored later by the prover
            timestamp: 0 // Will be stored later by the prover
         });

        docInfos[_docKeyHash] = _docInfo;

        // mint some tokens to the issuer
        _mint(issuer, tokenReward);

        // send tokens to the chainB
        _send(_sendParam, _fee, issuer);

        // Emit an event to notify the client that the document has been issued.
        emit DocIssued(_docKeyHash, _prover, _signedHash);
    }

    function setProof(bytes32 _docKeyHash, bytes calldata _proof, uint40 _timestamp) external {
        if (msg.sender != docInfos[_docKeyHash].prover) {
            revert Source__IncorrectProver();
        }
        DocInfo storage _docInfo = docInfos[_docKeyHash];
        _docInfo.proof = _proof;
        _docInfo.timestamp = _timestamp;

        emit DocProofUpdated(_docKeyHash, _proof, _timestamp);
    }

    function mint(address _to, uint256 _amount) public onlyOwner {
        _mint(_to, _amount);
    }

    // function _lzSend(
    //     uint32 _dstEid,
    //     bytes memory _message,
    //     bytes memory _options,
    //     MessagingFee memory _fee,
    //     address _refundAddress
    // )
    //     internal
    //     virtual
    //     override
    //     returns (MessagingReceipt memory receipt)
    // {
    //     // @dev Push corresponding fees to the endpoint, any excess is sent back to the _refundAddress from the
    //     // endpoint.
    //     _payNative(_fee.nativeFee);
    //     if (_fee.lzTokenFee > 0) _payLzToken(_fee.lzTokenFee);

    //     return endpoint
    //         // solhint-disable-next-line check-send-result
    //         .send(
    //         MessagingParams(_dstEid, _getPeerOrRevert(_dstEid), _message, _options, _fee.lzTokenFee > 0),
    // _refundAddress
    //     );
    // }

    // function _payNative(uint256 _nativeFee) internal virtual override returns (uint256 nativeFee) {
    //     address nativeErc20 = endpoint.nativeToken();
    //     if (nativeErc20 == address(0)) revert LzAltTokenUnavailable();

    //     // Pay Alt token fee by sending tokens to the endpoint.
    //     IERC20(nativeErc20).safeTransferFrom(msg.sender, address(endpoint), _nativeFee);
    // }
}
