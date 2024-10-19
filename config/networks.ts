import { EndpointId } from "@layerzerolabs/lz-definitions";
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";

const dotenvConfigPath: string = process.env.DOTENV_CONFIG_PATH || "./.env";
dotenvConfig({ path: resolve(process.cwd(), dotenvConfigPath) });

/**
 * All supported network names
 * To use a network in your command use the value of each key
 *
 * e.g.
 *
 * $ yarn deploy:network mainnet
 *
 * $ npx hardhat run scripts/deploy.ts --network polygon-mainnet
 */
export enum NetworkName {
  // ETHEREUM
  ETH_MAINNET = "eth-mainnet",
  ETH_SEPOLIA = "eth-sepolia",

  // BASE
  BASE_MAINNET = "base-mainnet",
  BASE_SEPOLIA = "base-sepolia",

  // BINANCE SMART CHAIN
  BSC_MAINNET = "bsc-mainnet",
  BSC_TESTNET = "bsc-testnet",

  // POLYGON
  POLYGON_MAINNET = "polygon-mainnet",
  POLYGON_AMOY = "polygon-amoy",

  // OPTIMISM
  OPTIMISM_MAINNET = "optimism-mainnet",
  OPTIMISM_SEPOLIA = "optimism-sepolia",

  // ARBITRUM
  ARBITRUM_MAINNET = "arbitrum-mainnet",
  ARBITRUM_SEPOLIA = "arbitrum-sepolia",
}

export interface Network {
  eid: EndpointId | undefined;
  chainId: number;
  url: string;
}

export const NETWORKS: { readonly [key in NetworkName]: Network } = {
  // ETHEREUM
  [NetworkName.ETH_MAINNET]: {
    eid: EndpointId.ETHEREUM_V2_MAINNET,
    chainId: 1,
    url: process.env.RPC_ETH_MAINNET || "https://rpc.ankr.com/eth",
  },
  [NetworkName.ETH_SEPOLIA]: {
    eid: EndpointId.ETHEREUM_V2_TESTNET,
    chainId: 11_155_111,
    url: process.env.RPC_ETH_SEPOLIA || "https://rpc.ankr.com/eth_sepolia",
  },

  // BASE
  [NetworkName.BASE_MAINNET]: {
    eid: EndpointId.BASE_V2_MAINNET,
    chainId: 8_453,
    url: process.env.RPC_BASE_MAINNET || "https://rpc.ankr.com/base",
  },
  [NetworkName.BASE_SEPOLIA]: {
    eid: EndpointId.BASE_V2_TESTNET,
    chainId: 84_532,
    url: process.env.RPC_BASE_SEPOLIA || "https://rpc.ankr.com/base_sepolia",
  },

  // BINANCE SMART CHAIN
  [NetworkName.BSC_MAINNET]: {
    eid: EndpointId.BSC_V2_MAINNET,
    chainId: 56,
    url: process.env.BSC_MAINNET || "https://bsc-dataseed1.defibit.io/",
  },
  [NetworkName.BSC_TESTNET]: {
    eid: EndpointId.BSC_V2_TESTNET,
    chainId: 97,
    url: process.env.BSC_TESTNET || "https://data-seed-prebsc-2-s1.binance.org:8545/",
  },

  // MATIC/POLYGON
  [NetworkName.POLYGON_MAINNET]: {
    eid: EndpointId.POLYGON_V2_MAINNET,
    chainId: 137,
    url: process.env.RPC_POLYGON_MAINNET || "https://rpc.ankr.com/polygon",
  },
  [NetworkName.POLYGON_AMOY]: {
    eid: EndpointId.POLYGON_V2_TESTNET,
    chainId: 80_002,
    url: process.env.RPC_POLYGON_AMOY || "https://rpc.ankr.com/polygon_amoy",
  },

  // OPTIMISM
  [NetworkName.OPTIMISM_MAINNET]: {
    eid: EndpointId.OPTIMISM_V2_MAINNET,
    chainId: 10,
    url: process.env.RPC_OPTIMISM_MAINNET || "https://rpc.ankr.com/optimism",
  },
  [NetworkName.OPTIMISM_SEPOLIA]: {
    eid: EndpointId.OPTIMISM_V2_TESTNET,
    chainId: 11_155_420,
    url: process.env.RPC_OPTIMISM_SEPOLIA || "https://rpc.ankr.com/optimism_sepolia",
  },

  // ARBITRUM
  [NetworkName.ARBITRUM_MAINNET]: {
    eid: EndpointId.ARBITRUM_V2_MAINNET,
    chainId: 42_161,
    url: process.env.RPC_ARBITRUM_MAINNET || "https://rpc.ankr.com/arbitrum",
  },
  [NetworkName.ARBITRUM_SEPOLIA]: {
    eid: EndpointId.ARBITRUM_V2_TESTNET,
    chainId: 421_614,
    url: process.env.RPC_ARBITRUM_SEPOLIA || "https://rpc.ankr.com/arbitrum_sepolia",
  },
} as const;

export const DEVELOPMENT_CHAINS: string[] = ["hardhat", "localhost", "ganache", "anvil"];
