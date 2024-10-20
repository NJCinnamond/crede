// skaleRPC.ts

import { ethers, Contract, JsonRpcProvider, keccak256 } from 'ethers';
import { ContractABI } from './Contract';

export enum SKALEChain {
  CALYPSO = 'calypso',
  EUROPA = 'europa',
  CHAOS = 'chaos',
  TESTNET = 'testnet'
}

export interface SKALEEndpoints {
  [SKALEChain.CALYPSO]: string;
  [SKALEChain.EUROPA]: string;
  [SKALEChain.CHAOS]: string;
  [SKALEChain.TESTNET]: string;
}

export interface SKALEProviderConfig {
  endpoint: string;
  chainId?: number;
}

export class SKALEProvider {
  private static readonly ENDPOINTS: SKALEEndpoints = {
    [SKALEChain.CALYPSO]: "https://mainnet.skalenodes.com/v1/honorable-steel-rasalhague",
    [SKALEChain.EUROPA]: "https://testnet.skalenodes.com/v1/juicy-low-small-testnet",
    [SKALEChain.CHAOS]: "https://mainnet.skalenodes.com/v1/haunting-devoted-deneb",
    [SKALEChain.TESTNET]: "https://staging-v3.skalenodes.com/v1/staging-fast-active-bellatrix"
  };

  private provider: JsonRpcProvider;

  constructor(config: SKALEProviderConfig) {
    this.provider = new ethers.JsonRpcProvider(config.endpoint);
  }

  /**
   * Create a provider instance for a specific SKALE chain
   */
  public static forChain(chain: SKALEChain): SKALEProvider {
    return new SKALEProvider({ endpoint: SKALEProvider.ENDPOINTS[chain] });
  }

  /**
   * Get the underlying ethers provider
   */
  public getProvider(): JsonRpcProvider {
    return this.provider;
  }

  /**
   * Get the current block number
   */
  public async getBlockNumber(): Promise<number> {
    try {
      return await this.provider.getBlockNumber();
    } catch (error) {
      throw new Error(`Failed to get block number: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the balance of an address
   */
  public async getBalance(address: string): Promise<{
    raw: bigint;
    formatted: string;
  }> {
    try {
      const balance = await this.provider.getBalance(address);
      return {
        raw: balance,
        formatted: ethers.formatEther(balance)
      };
    } catch (error) {
      throw new Error(`Failed to get balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a contract instance
   */
  public getContract<T extends Contract>(
    address: string,
    abi: ethers.InterfaceAbi
  ): T {
    try {
      return new Contract(address, abi, this.provider) as T;
    } catch (error) {
      throw new Error(`Failed to create contract instance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

type DocInfo = {
  prover: string;
  timestamp: number;
  signedHash: string;
  proof: string;
}

// // Example interface for a custom contract
// export interface SourceContract extends Contract {
//   someMethod(): Promise<string>;
//   // Add other contract methods here
// }

// Usage example:
export async function getSignatureForHash(docKey: string) {
  // Connect to SKALE Calypso network
  const skale = SKALEProvider.forChain(SKALEChain.EUROPA);
  
  // Example of connecting to a custom contract
  const contractAddress = "0xf7f861870aC67B27322E6f23f3442E660103Ce00";
  const contract = skale.getContract(contractAddress, ContractABI);
  
  // Example of calling a contract method
  // const result = await contract.someMethod();

  console.log("Contract: ", contract)

  const docKeyHash = keccak256(ethers.toUtf8Bytes(docKey));
  const docInfo = await contract.docInfos(docKeyHash)

  console.log("Doc info: ", docInfo)

  return docInfo;
}