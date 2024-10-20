import { keccak256 } from "@ethersproject/solidity";
import { Options } from "@layerzerolabs/lz-v2-utilities";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract, ContractFactory } from "ethers";
import { solidityKeccak256 } from "ethers/lib/utils";
import { deployments, ethers } from "hardhat";

import { Destination, Destination__factory, Source, Source__factory } from "../../types";
import { MessagingFeeStruct, SendParamStruct } from "../../types/@layerzerolabs/oft-evm/contracts/interfaces/IOFT";

describe("Crede Test", function () {
  // Constant representing a mock Endpoint ID for testing purposes
  const eidA = 1;
  const eidB = 2;
  // Declaration of variables to be used in the test suite
  let Source: Source__factory;
  let Destination: Destination__factory;
  let EndpointV2Mock: ContractFactory;
  let ownerA: SignerWithAddress;
  let ownerB: SignerWithAddress;
  let endpointOwner: SignerWithAddress;
  let issuer: SignerWithAddress;
  let prover: SignerWithAddress;
  let source: Source;
  let destination: Destination;
  let mockEndpointV2A: Contract;
  let mockEndpointV2B: Contract;

  const decoder = new TextDecoder("utf-8");

  const sampleProof = ethers.utils.toUtf8Bytes(
    '{"curve":"bn128","pi_a":["9101883383049000104073619355601631108699415048629057425244512952930590364012","14934657682890689746053652093146976332194029865174971459032167110397473537949","1"],"pi_b":[["14021879761272328052390042351303534418318878686560723234568697033225283024566","4806846995601770419162529313601536774988514956526598728824403473260395977689"],["13709445512919846353785661709905806350777195619348686974284763017443907186970","4414084233285007101997778311773381986137166860704772030966271135988114835460"],["1","0"]],"pi_c":["20800646827339092164260847061948185912328706503481541270320821731079287451974","16340311457184926111282441001594733088258559531093324393067085734266031169503","1"],"protocol":"groth16"}'
  );

  const signedHash = ethers.utils.toUtf8Bytes(
    '{"sigR":["0x2df01549a50bc279","0x5d7eb2e38d83a563","0xe99cc599fd61a917","0x4d0bf5623c59274d"],"sigS":["0xba1abc8b2649ae5c","0xfdba11b93523cc06","0x74ed0f8cb647b4ce","0x129e301b0dad2386"]}'
  );

  const bytes = ethers.utils.toUtf8Bytes("0x8c8d678fb414a28c6b55dcd33c306453cbeaaa8472f8361d24093fd7d2db574f");
  const docKeyHash = ethers.utils.keccak256(bytes);

  // Before hook for setup that runs once before all tests in the block
  before(async function () {
    // Contract factory for our tested contract
    //
    // We are using a derived contract that exposes a mint() function for testing purposes
    Source = await ethers.getContractFactory("Source");
    Destination = await ethers.getContractFactory("Destination");

    // Fetching the first three signers (accounts) from Hardhat's local Ethereum network
    const signers = await ethers.getSigners();

    ownerA = signers.at(0)!;
    ownerB = signers.at(1)!;
    issuer = signers.at(2)!;
    prover = signers.at(3)!;
    endpointOwner = signers.at(4)!;

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
    // Deploying a mock LZEndpoint with the given Endpoint ID
    mockEndpointV2A = await EndpointV2Mock.deploy(eidA);
    mockEndpointV2B = await EndpointV2Mock.deploy(eidB);

    source = await Source.deploy(
      "sourceToken",
      "SCrede",
      mockEndpointV2A.address,
      ownerA.address,
      issuer.address,
      ethers.utils.parseUnits("1", 18)
    );
    destination = await Destination.deploy("destinationToken", "DCrede", mockEndpointV2B.address, ownerB.address);

    // Setting destination endpoints in the LZEndpoint mock for each MyOFT instance
    await mockEndpointV2A.setDestLzEndpoint(destination.address, mockEndpointV2B.address);
    await mockEndpointV2B.setDestLzEndpoint(source.address, mockEndpointV2A.address);

    // Setting each MyOFT instance as a peer of the other in the mock LZEndpoint
    await source.connect(ownerA).setPeer(eidB, ethers.utils.zeroPad(destination.address, 32));
    await destination.connect(ownerB).setPeer(eidA, ethers.utils.zeroPad(source.address, 32));
  });

  // A test case to verify token transfer functionality
  it("should send a token from A address to B address via each OFT", async function () {
    // Defining the amount of tokens to send and constructing the parameters for the send operation
    const tokensToSend = ethers.utils.parseEther("1");

    // Defining extra message execution options for the send operation
    const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString();

    const sendParam: SendParamStruct = [
      eidB,
      ethers.utils.zeroPad(issuer.address, 32),
      tokensToSend,
      tokensToSend,
      options,
      "0x",
      "0x",
    ] as unknown as SendParamStruct;

    // Fetching the native fee for the token send operation
    const [nativeFee] = await source.quoteSend(sendParam, false);

    // timestamp
    const timestamp = Math.floor(Date.now() / 1000);

    // fee
    const fee: MessagingFeeStruct = {
      nativeFee,
      lzTokenFee: 0,
    };

    await source.connect(issuer).issueDoc(prover.address, docKeyHash, signedHash, sendParam, fee, { value: nativeFee });

    // Asserting the states are changing
    let docInfo = await source.docInfos(docKeyHash);
    expect(docInfo.prover).to.be.equal(prover.address);
    expect(ethers.utils.toUtf8String(docInfo.signedHash)).to.be.equal(decoder.decode(signedHash));

    // prover sets the proof
    await source.connect(prover).setProof(docKeyHash, sampleProof, timestamp);

    docInfo = await source.docInfos(docKeyHash);
    expect(ethers.utils.toUtf8String(docInfo.proof)).to.be.equal(decoder.decode(sampleProof));

    // Fetching the final token balance of issuer
    expect(await destination.balanceOf(issuer.address)).to.be.equal(tokensToSend);
  });
});
