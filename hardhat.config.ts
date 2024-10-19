import "@layerzerolabs/toolbox-hardhat";
import "@nomicfoundation/hardhat-foundry";
import "@nomicfoundation/hardhat-toolbox";
import "@primitivefi/hardhat-dodoc";
import "@typechain/hardhat";
import { config as dotenvConfig } from "dotenv";
import "hardhat-contract-sizer";
import "hardhat-deploy";
import "hardhat-gas-reporter";
import { removeConsoleLog } from "hardhat-preprocessor";
import "hardhat-storage-layout";
import type { HardhatUserConfig } from "hardhat/config";
import type { HttpNetworkAccountsUserConfig, NetworkUserConfig } from "hardhat/types";
import { resolve } from "path";

import { API_KEYS, CUSTOM_CHAINS, DEVELOPMENT_CHAINS, NETWORKS, Network, NetworkName } from "./config";
import "./tasks";

const dotenvConfigPath: string = process.env.DOTENV_CONFIG_PATH || "./.env";
dotenvConfig({ path: resolve(__dirname, dotenvConfigPath) });

const TEST_MNEMONIC: string = "test test test test test test test test test test test junk";
const mnemonic: string = process.env.MNEMONIC || TEST_MNEMONIC;
const privateKey: string = process.env.PRIVATE_KEY || "";

/**
 * - If $PRIVATE_KEY is defined, use it.
 * - If $MNEMONIC is not defined, default to a test mnemonic.
 */
const getAccounts = (): HttpNetworkAccountsUserConfig => {
  if (privateKey) {
    // can add as many private keys as you want
    return [
      `0x${privateKey}`,
      // `0x${process.env.PRIVATE_KEY_2}`,
      // `0x${process.env.PRIVATE_KEY_3}`,
      // `0x${process.env.PRIVATE_KEY_4}`,
      // `0x${process.env.PRIVATE_KEY_5}`,
    ];
  } else {
    // use mnemonic
    return {
      mnemonic,
      count: 10,
      path: "m/44'/60'/0'/0",
    };
  }
};

// { [key in NetworkName]: { chainId, url, accounts } }
function getAllNetworkConfigs(): Record<NetworkName, NetworkUserConfig> {
  const networkConfigs = Object.entries(NETWORKS).reduce<Record<string, NetworkUserConfig>>((memo, network) => {
    const key = network[0] as NetworkName;
    const value = network[1] as Network;

    memo[key] = {
      ...value,
      accounts: getAccounts(),
    };
    return memo;
  }, {});

  return networkConfigs as Record<NetworkName, NetworkUserConfig>;
}

const config: HardhatUserConfig = {
  contractSizer: {
    alphaSort: true,
    runOnCompile: process.env.CONTRACT_SIZER ? true : false,
    disambiguatePaths: false,
  },
  defaultNetwork: "hardhat",
  dodoc: {
    runOnCompile: false,
    debugMode: false,
    keepFileStructure: true,
    freshOutput: true,
    outputDir: "./dodoc",
    include: ["contracts"],
  },
  etherscan: {
    apiKey: API_KEYS,
    customChains: CUSTOM_CHAINS,
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
    currency: "USD",
    // gasPrice: process.env.GAS_PRICE, // if commented out then it fetches from ethGasStationAPI
    coinmarketcap: process.env.COIN_MARKET_CAP_API_KEY || undefined,
    excludeContracts: [],
  },
  namedAccounts: {
    deployer: {
      default: 0, // here this will by default take the first account as deployer, wallet address of index[0], of the mnemonic in .env
    },
  },
  networks: {
    // Local network configs
    anvil: { chainId: 31337, url: "http://127.0.0.1:8545" },
    ganache: { chainId: 1337, url: "http://127.0.0.1:7545" },
    hardhat: { chainId: 31337 },
    localhost: { chainId: 31337 },
    "truffle-dashboard": {
      url: "http://localhost:24012/rpc",
    },
    // Mainnet and Testnet configs
    ...getAllNetworkConfigs(),
  },
  paths: {
    cache: "cache/hardhat",
  },
  preprocess: {
    eachLine: removeConsoleLog((hre) => !DEVELOPMENT_CHAINS.includes(hre.network.name)),
  },
  solidity: {
    compilers: [
      {
        version: "0.8.22",
        settings: {
          metadata: {
            // Not including the metadata hash
            // https://github.com/paulrberg/hardhat-template/issues/31
            bytecodeHash: "none",
          },
          // Disable the optimizer when debugging
          // https://hardhat.org/hardhat-network/#solidity-optimizer-support
          optimizer: {
            enabled: true,
            runs: 200,
          },
          evmVersion: "paris",
        },
      },
    ],
  },
  typechain: {
    outDir: "types",
    target: "ethers-v5",
    // externalArtifacts: [
    // "node_modules/@layerzerolabs/oapp-evm/artifacts/OAppOptionsType3.sol/OAppOptionsType3.json",
    // "node_modules/@layerzerolabs/oapp-evm/artifacts/IOAppOptionsType3.sol:IOAppOptionsType3.json",
    // "node_modules/@layerzerolabs/test-devtools-evm-hardhat/artifacts/contracts/mocks/EndpointV2Mock.sol/EndpointV2Mock.json",
    // ],
  },
};

export default config;
