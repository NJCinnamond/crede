// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";
import { Origin } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";

import "hardhat/console.sol";

contract Destination is OFT {
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    )
        OFT(_name, _symbol, _lzEndpoint, _delegate)
        Ownable(_delegate)
    { }

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
        console.logBytes(message);
    }
}
