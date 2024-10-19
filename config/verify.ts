import { ChainConfig } from "@nomicfoundation/hardhat-verify/types";
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";

const dotenvConfigPath: string = process.env.DOTENV_CONFIG_PATH || "./.env";
dotenvConfig({ path: resolve(process.cwd(), dotenvConfigPath) });

export const API_KEYS: string | Record<string, string> | undefined = {
  // ETHEREUM
  mainnet: process.env.ETHERSCAN_API_KEY || "",
  sepolia: process.env.ETHERSCAN_API_KEY || "",

  // BASE
  base: process.env.BASESCAN_API_KEY || "",
  baseSepolia: process.env.BASESCAN_API_KEY || "",

  // BINANCE SMART CHAIN
  bsc: process.env.BSCSCAN_API_KEY || "",
  bscTestnet: process.env.BSCSCAN_API_KEY || "",

  // MATIC/POLYGON
  polygon: process.env.POLYGONSCAN_API_KEY || "",
  polygonAmoy: process.env.POLYGONSCAN_API_KEY || "",

  // OPTIMISM
  optimisticEthereum: process.env.OPTIMISM_API_KEY || "",
  optimisticSepolia: process.env.OPTIMISM_API_KEY || "",

  // ARBITRUM
  arbitrumOne: process.env.ARBISCAN_API_KEY || "",
  arbitrumSepolia: process.env.ARBISCAN_API_KEY || "",
} as const;

// customChains: [
//   {
//     network: "goerli",
//     chainId: 5,
//     urls: {
//       apiURL: "https://api-goerli.etherscan.io/api",
//       browserURL: "https://goerli.etherscan.io"
//     }
//   }
// ]

export const CUSTOM_CHAINS: ChainConfig[] = [
  {
    network: "optimisticSepolia",
    chainId: 11_155_420,
    urls: {
      apiURL: "https://api-sepolia-optimistic.etherscan.io/api",
      browserURL: "https://sepolia-optimism.etherscan.io/",
    },
  },
] as const;
