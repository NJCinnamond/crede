import assert from "assert";
import { keccak256, toUtf8Bytes } from "ethers/lib/utils";
import { type DeployFunction, Deployment } from "hardhat-deploy/types";

import { Source } from "../types";

const contractName = "SetProof";

const sampleProof = toUtf8Bytes(
  '{"curve":"bn128","pi_a":["9101883383049000104073619355601631108699415048629057425244512952930590364012","14934657682890689746053652093146976332194029865174971459032167110397473537949","1"],"pi_b":[["14021879761272328052390042351303534418318878686560723234568697033225283024566","4806846995601770419162529313601536774988514956526598728824403473260395977689"],["13709445512919846353785661709905806350777195619348686974284763017443907186970","4414084233285007101997778311773381986137166860704772030966271135988114835460"],["1","0"]],"pi_c":["20800646827339092164260847061948185912328706503481541270320821731079287451974","16340311457184926111282441001594733088258559531093324393067085734266031169503","1"],"protocol":"groth16"}'
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

  // timestamp
  const timestamp = Math.floor(Date.now() / 1000);

  const tx = await source.connect(deployerSigner).setProof(docKeyHash, sampleProof, timestamp);
  console.log(`Transaction hash: ${(await tx.wait()).transactionHash}`);
};

deploy.tags = [contractName];

export default deploy;
