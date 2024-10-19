// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

// contracts imports
import { Source } from "../../contracts/Source.sol";
import { Destination } from "../../contracts/Destination.sol";
import { Token } from "../../contracts/tokens/Token.sol";
import { FaultyToken } from "../../contracts/tokens/FaultyToken.sol";
import { FaultyTransferToken } from "../../contracts/tokens/FaultyTransferToken.sol";

// OApp imports
import {
    IOAppOptionsType3, EnforcedOptionParam
} from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";
import { MessagingFee } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { MessagingReceipt } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppSender.sol";

// OZ imports
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

// Forge imports
import "forge-std/console2.sol";

// DevTools imports
import { TestHelperOz5 } from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelperOz5.sol";

contract FlowTest is TestHelperOz5 {
    using OptionsBuilder for bytes;

    uint32 private sourceEid = 1;
    uint32 private destinationEid = 2;

    Source private source;
    Destination private destination;
    Token private token;
    FaultyToken private faultyToken;
    FaultyTransferToken private faultyTransferToken;

    address private userA = address(0x123);
    address private userB = address(0x234);
    uint256 private initialBalance = 100 ether;

    error Destination__TokenTransferFailed();

    function setUp() public virtual override {
        vm.deal(userA, 1000 ether);
        vm.deal(userB, 1000 ether);

        super.setUp();
        setUpEndpoints({ _endpointNum: 2, _libraryType: LibraryType.UltraLightNode });

        // deploy tokens
        token = new Token();
        faultyToken = new FaultyToken();
        faultyTransferToken = new FaultyTransferToken();

        source = Source(
            _deployOApp({
                _oappBytecode: type(Source).creationCode,
                _constructorArgs: abi.encode(address(endpoints[sourceEid]), address(this))
            })
        );

        destination = Destination(
            _deployOApp({
                _oappBytecode: type(Destination).creationCode,
                _constructorArgs: abi.encode(address(endpoints[destinationEid]), address(this), address(token))
            })
        );

        address[] memory oapps = new address[](2);
        oapps[0] = address(source);
        oapps[1] = address(destination);
        this.wireOApps(oapps);
    }

    function test_whenMessageIsSentFromSourceToDestination() public {
        // mint 100 tokens to the destination contract
        token.mint(address(destination), 100 ether);

        assertEq(token.balanceOf(address(destination)), 100 ether);
        assertEq(token.balanceOf(address(userA)), 0);

        bytes memory encodedMessage = source.encodeMessage(address(userA), 10 ether);

        // Generates 1 lzReceive execution option via the OptionsBuilder library.
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(150_000, 0);

        MessagingFee memory fee = source.quote(destinationEid, encodedMessage, options, false);

        // STEP 1: Sending a message via the _lzSend() method.
        MessagingReceipt memory receipt = source.send{ value: fee.nativeFee }(destinationEid, encodedMessage, options);

        // Asserting the accounting is done in source contract
        assertEq(source.accounting(userA), 10 ether);

        // Asserting that the receiver does not have any tokens
        assertEq(token.balanceOf(address(userA)), 0);

        // STEP 2 & 3: Deliver packet to destination manually.
        // asserts the guid as well
        verifyPackets({ _dstEid: destinationEid, _dstAddress: address(destination) });
        bytes memory packetBytes = packets[receipt.guid];
        this.assertGuid(packetBytes, receipt.guid);

        // Asserting the destination sent the tokens to the receiver
        assertEq(token.balanceOf(address(destination)), 90 ether);

        // Asserting the receiver has received the tokens
        assertEq(token.balanceOf(address(userA)), 10 ether);
    }

    // When a revert in destination, should send a resolve message from destination to source when accounting done but
    // tokens not received on chain B
    function test_RevertWhenTransferFailsInDestination() public {
        // set the token to be faulty
        destination.setToken(IERC20(faultyToken));

        // mint 100 tokens to the destination contract
        faultyToken.mint(address(destination), 100 ether);

        assertEq(faultyToken.balanceOf(address(destination)), 100 ether);
        assertEq(faultyToken.balanceOf(address(userA)), 0);

        bytes memory encodedMessage = source.encodeMessage(address(userA), 10 ether);

        // Generates 1 lzReceive execution option via the OptionsBuilder library.
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(150_000, 0);

        MessagingFee memory fee = source.quote(destinationEid, encodedMessage, options, false);

        // STEP 1: Sending a message via the _lzSend() method.
        MessagingReceipt memory receipt = source.send{ value: fee.nativeFee }(destinationEid, encodedMessage, options);

        // Asserting the accounting is done in source contract
        assertEq(source.accounting(userA), 10 ether);

        // Asserting that the receiver does not have any tokens
        assertEq(token.balanceOf(address(userA)), 0);

        // vm.expectRevert(Destination__TokenTransferFailed.selector);

        // STEP 2 & 3: Deliver packet to destination manually.
        // asserts the guid as well
        // verifyPackets({ _dstEid: destinationEid, _dstAddress: address(destination) });
    }
}
