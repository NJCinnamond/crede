import { Options } from "@layerzerolabs/lz-v2-utilities";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Contract, ContractFactory } from "ethers";
import { deployments, ethers } from "hardhat";

import {
  Destination,
  Destination__factory,
  FaultyToken,
  FaultyToken__factory,
  FaultyTransferToken,
  FaultyTransferToken__factory,
  Source,
  Source__factory,
  Token,
  Token__factory,
} from "../../types";

describe("Flow", function () {
  // Constant representing a mock Endpoint ID for testing purposes
  const eidSource = 1;
  const eidDestination = 2;

  // Declaration of variables to be used in the test suite
  let Token: Token__factory;
  let FaultyToken: FaultyToken__factory;
  let FaultyTransferToken: FaultyTransferToken__factory;
  let Source: Source__factory;
  let Destination: Destination__factory;
  let EndpointV2Mock: ContractFactory;

  let ownerA: SignerWithAddress;
  let ownerB: SignerWithAddress;
  let endpointOwner: SignerWithAddress;
  let addr1: SignerWithAddress;

  let token: Token;
  let faultyToken: FaultyToken;
  let faultyTransferToken: FaultyTransferToken;
  let source: Source;
  let destination: Destination;
  let mockEndpointV2Source: Contract;
  let mockEndpointV2Destination: Contract;

  // Before hook for setup that runs once before all tests in the block
  before(async function () {
    // Contract factory for our tested contract
    Token = await ethers.getContractFactory("Token");
    FaultyToken = await ethers.getContractFactory("FaultyToken");
    FaultyTransferToken = await ethers.getContractFactory("FaultyTransferToken");
    Source = await ethers.getContractFactory("Source");
    Destination = await ethers.getContractFactory("Destination");

    // Fetching the first three signers (accounts) from Hardhat's local Ethereum network
    const signers = await ethers.getSigners();

    ownerA = signers.at(0)!;
    ownerB = signers.at(1)!;
    endpointOwner = signers.at(2)!;
    addr1 = signers.at(3)!;

    // The EndpointV2Mock contract comes from @layerzerolabs/test-devtools-evm-hardhat package
    // and its artifacts are connected as external artifacts to this project
    //
    // Unfortunately, hardhat itself does not yet provide a way of connecting external artifacts,
    // so we rely on hardhat-deploy to create a ContractFactory for EndpointV2Mock
    //
    // See https://github.com/NomicFoundation/hardhat/issues/1040
    const EndpointV2MockArtifact = await deployments.getArtifact("EndpointV2Mock");
    EndpointV2Mock = new ContractFactory(EndpointV2MockArtifact.abi, EndpointV2MockArtifact.bytecode, endpointOwner);
  });

  // beforeEach hook for setup that runs before each test in the block
  beforeEach(async function () {
    // Deploying a mock LZ EndpointV2 with the given Endpoint ID
    mockEndpointV2Source = await EndpointV2Mock.deploy(eidSource);
    mockEndpointV2Destination = await EndpointV2Mock.deploy(eidDestination);

    // Deploying two instances of MyOApp contract and linking them to the mock LZEndpoint
    token = await Token.deploy();
    faultyToken = await FaultyToken.deploy();
    faultyTransferToken = await FaultyTransferToken.deploy();
    source = await Source.deploy(mockEndpointV2Source.address, ownerA.address);
    destination = await Destination.deploy(mockEndpointV2Destination.address, ownerB.address, token.address);

    // Setting destination endpoints in the LZEndpoint mock for source and destination
    await mockEndpointV2Destination.setDestLzEndpoint(source.address, mockEndpointV2Source.address);
    await mockEndpointV2Source.setDestLzEndpoint(destination.address, mockEndpointV2Destination.address);

    // Setting source and destination as a peer of the other
    await source.connect(ownerA).setPeer(eidDestination, ethers.utils.zeroPad(destination.address, 32));
    await destination.connect(ownerB).setPeer(eidSource, ethers.utils.zeroPad(source.address, 32));
  });

  it("should send a message from source to destination OApp", async function () {
    // mint 100 tokens to the destination contract
    await token.mint(destination.address, ethers.utils.parseEther("100"));

    expect((await token.balanceOf(destination.address)).toString()).to.equal(ethers.utils.parseEther("100").toString());

    const options = Options.newOptions().addExecutorLzReceiveOption(500000, 0).toHex().toString();

    const expectedEncodedMessage = ethers.utils.defaultAbiCoder.encode(
      ["address", "uint256"],
      [addr1.address, ethers.utils.parseEther("10")]
    );
    const encodedMessage = await source.encodeMessage(addr1.address, ethers.utils.parseEther("10"));
    expect(encodedMessage).to.equal(expectedEncodedMessage);

    // Define native fee and quote for the message send operation
    let nativeFee = BigNumber.from(0);
    [nativeFee] = await source.quote(eidDestination, encodedMessage, options, false);

    // Execute send operation from source
    await source.send(eidDestination, encodedMessage, options, { value: nativeFee.toString() });

    // Assert the resulting state of data in the destination OApp
    expect((await token.balanceOf(addr1.address)).toString()).to.equal(ethers.utils.parseEther("10").toString());
    expect((await token.balanceOf(destination.address)).toString()).to.equal(ethers.utils.parseEther("90").toString());
  });

  it("when a revert in destination, should send a resolve message from destination to source when accounting done but tokens not received on chain B", async function () {
    const options = Options.newOptions().addExecutorLzReceiveOption(50000000, 0).toHex().toString();

    // set the token to be faulty
    await destination.connect(ownerB).setToken(faultyToken.address);

    // mint 100 faulty tokens to the destination contract
    await faultyToken.mint(destination.address, ethers.utils.parseEther("100"));

    expect((await faultyToken.balanceOf(destination.address)).toString()).to.equal(
      ethers.utils.parseEther("100").toString()
    );

    const expectedEncodedMessage = ethers.utils.defaultAbiCoder.encode(
      ["address", "uint256"],
      [addr1.address, ethers.utils.parseEther("10")]
    );
    const encodedMessage = await source.encodeMessage(addr1.address, ethers.utils.parseEther("10"));
    expect(encodedMessage).to.equal(expectedEncodedMessage);

    // Define native fee and quote for the message send operation
    let nativeFee = BigNumber.from(0);
    [nativeFee] = await source.quote(eidDestination, encodedMessage, options, false);

    // Execute send operation from source
    // This will fail because the destination contract has a faulty token which returns false
    // when transferring and the receive txn will revert with `Destination__TokenTransferFailed()`
    const tx = await source.send(eidDestination, encodedMessage, options, { value: nativeFee.toString() });

    const guid = (await tx.wait())?.events?.[0]?.args?.guid;

    expect((await faultyToken.balanceOf(addr1.address)).toString()).to.equal("0");
    expect((await faultyToken.balanceOf(destination.address)).toString()).to.equal(
      ethers.utils.parseEther("100").toString()
    );

    // Accounting is done on the source contract
    const accountingBeforeResolution = await source.accounting(addr1.address);
    expect(accountingBeforeResolution.toString()).to.equal(ethers.utils.parseEther("10").toString());

    // but tokens are not received on destination
    // so the destination contract will send a resolve message to the source contract
    const resolveEncodedMessage = await destination.encodeResolveMessage(
      guid,
      addr1.address,
      ethers.utils.parseEther("10")
    );

    [nativeFee] = await destination.quote(eidSource, resolveEncodedMessage, options, false);
    await destination.send(eidSource, resolveEncodedMessage, options, { value: nativeFee.toString() });

    expect((await faultyToken.balanceOf(addr1.address)).toString()).to.equal("0");
    const accountingAfterResolution = await source.accounting(addr1.address);
    expect(accountingAfterResolution.toString()).to.equal("0");

    // we cannot use the same guid twice
    await expect(
      destination.send(eidSource, resolveEncodedMessage, options, { value: nativeFee.toString() })
    ).to.revertedWithCustomError(destination, "Destination__MessageAlreadyProcessed");
  });

  it("when a revert in token, should send a resolve message from destination to source when accounting done but tokens not received on chain B", async function () {
    const options = Options.newOptions().addExecutorLzReceiveOption(50000, 0).toHex().toString();

    // set the token to be faulty
    await destination.connect(ownerB).setToken(faultyTransferToken.address);

    // mint 100 faulty tokens to the destination contract
    await faultyTransferToken.mint(destination.address, ethers.utils.parseEther("100"));

    expect((await faultyTransferToken.balanceOf(destination.address)).toString()).to.equal(
      ethers.utils.parseEther("100").toString()
    );

    const expectedEncodedMessage = ethers.utils.defaultAbiCoder.encode(
      ["address", "uint256"],
      [addr1.address, ethers.utils.parseEther("10")]
    );
    const encodedMessage = await source.encodeMessage(addr1.address, ethers.utils.parseEther("10"));
    expect(encodedMessage).to.equal(expectedEncodedMessage);

    // Define native fee and quote for the message send operation
    let nativeFee = BigNumber.from(0);
    [nativeFee] = await source.quote(eidDestination, encodedMessage, options, false);

    // Execute send operation from source
    // This will fail because the destination contract has a faulty token which returns false
    // when transferring and the receive txn will revert with `FaultyTransferToken__TransferFailed()`
    const tx = await source.send(eidDestination, encodedMessage, options, { value: nativeFee.toString() });
    const guid = (await tx.wait())?.events?.[0]?.args?.guid;

    expect((await faultyTransferToken.balanceOf(addr1.address)).toString()).to.equal("0");
    expect((await faultyTransferToken.balanceOf(destination.address)).toString()).to.equal(
      ethers.utils.parseEther("100").toString()
    );

    // Accounting is done on the source contract
    const accountingBeforeResolution = await source.accounting(addr1.address);
    expect(accountingBeforeResolution.toString()).to.equal(ethers.utils.parseEther("10").toString());

    // but tokens are not received on destination
    // so the destination contract will send a resolve message to the source contract
    const resolveEncodedMessage = await destination.encodeResolveMessage(
      guid,
      addr1.address,
      ethers.utils.parseEther("10")
    );

    [nativeFee] = await destination.quote(eidSource, resolveEncodedMessage, options, false);
    await destination.send(eidSource, resolveEncodedMessage, options, { value: nativeFee.toString() });

    expect((await faultyTransferToken.balanceOf(addr1.address)).toString()).to.equal("0");
    const accountingAfterResolution = await source.accounting(addr1.address);
    expect(accountingAfterResolution.toString()).to.equal("0");
  });
});
