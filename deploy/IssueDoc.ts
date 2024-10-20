import { MaxUint256 } from "@ethersproject/constants";
import { EndpointId } from "@layerzerolabs/lz-definitions";
import { Options } from "@layerzerolabs/lz-v2-utilities";
import assert from "assert";
import { BigNumber } from "ethers";
import { keccak256, parseUnits, toUtf8Bytes } from "ethers/lib/utils";
import { type DeployFunction, Deployment } from "hardhat-deploy/types";

import { Source } from "../types";
import { MessagingFeeStruct, SendParamStruct } from "../types/@layerzerolabs/oft-evm/contracts/interfaces/IOFT";

const contractName = "IssueDoc";

const signedHash = toUtf8Bytes(
  '{"sigR":["0x2df01549a50bc279","0x5d7eb2e38d83a563","0xe99cc599fd61a917","0x4d0bf5623c59274d"],"sigS":["0xba1abc8b2649ae5c","0xfdba11b93523cc06","0x74ed0f8cb647b4ce","0x129e301b0dad2386"]}'
);

const bytes = toUtf8Bytes("0x8c8d678fb414a28c6b55dcd33c306453cbeaaa8472f8361d24093fd7d2db574f");
const docKeyHash = keccak256(bytes);

const deploy: DeployFunction = async (hre) => {
  const { getNamedAccounts, deployments, ethers } = hre;
  const { deployer } = await getNamedAccounts();
  const deployerSigner = await ethers.getSigner(deployer);

  assert(deployer, "Missing named deployer account");

  console.log(`Network: ${hre.network.name}`);
  console.log(`Deployer: ${deployer}`);

  const sourceDeployment: Deployment = await deployments.get("Source");

  const source: Source = await ethers.getContractAt("Source", sourceDeployment.address);

  // Defining the amount of tokens to send and constructing the parameters for the send operation
  const tokensToSend = ethers.utils.parseEther("1");

  // Defining extra message execution options for the send operation
  const options = Options.newOptions().addExecutorLzReceiveOption(2000000, 0).toHex().toString();

  const decoder = new TextDecoder("utf-8");

  const token = await ethers.getContractAt("IERC20", "0x6c71319b1F910Cf989AD386CcD4f8CC8573027aB");

  await token.connect(deployerSigner).approve(source.address, MaxUint256);

  const sendParam: SendParamStruct = [
    EndpointId.AMOY_V2_TESTNET,
    ethers.utils.zeroPad(deployer, 32),
    tokensToSend,
    tokensToSend,
    options,
    "0x",
    "0x",
  ] as unknown as SendParamStruct;

  console.log("sendParam: ", sendParam);

  // const tx = await source.connect(deployerSigner).mint(sourceDeployment.address, parseUnits("100", 18));
  // console.log(await tx.wait());

  // return;

  // Fetching the native fee for the token send operation
  const [nativeFee] = await source.quoteSend(sendParam, false);

  console.log("nativeFee: ", nativeFee);

  // fee
  const fee: MessagingFeeStruct = {
    nativeFee,
    lzTokenFee: 0,
  };

  await source.connect(deployerSigner).issueDoc(deployer, docKeyHash, signedHash, sendParam, fee, {
    value: nativeFee.add(BigNumber.from("10000000000000000")),
  });
  console.log("here");
};

deploy.tags = [contractName];

export default deploy;
