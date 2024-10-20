import { EndpointId } from "@layerzerolabs/lz-definitions";
import type { OAppOmniGraphHardhat, OmniPointHardhat } from "@layerzerolabs/toolbox-hardhat";

const skaleContract: OmniPointHardhat = {
  eid: EndpointId.SKALE_V2_TESTNET,
  contractName: "Destination",
};

const amoyContract: OmniPointHardhat = {
  eid: EndpointId.AMOY_V2_TESTNET,
  contractName: "Source",
};

const config: OAppOmniGraphHardhat = {
  contracts: [
    {
      contract: skaleContract,
    },
    {
      contract: amoyContract,
    },
  ],
  connections: [
    {
      from: skaleContract,
      to: amoyContract,
    },
    {
      from: amoyContract,
      to: skaleContract,
    },
  ],
};

export default config;
