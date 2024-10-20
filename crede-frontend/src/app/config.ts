import { AlchemyAccountsUIConfig, createConfig } from "@account-kit/react";
import { sepolia, alchemy } from "@account-kit/infra";
import { QueryClient } from "@tanstack/react-query";

const uiConfig: AlchemyAccountsUIConfig = {
  illustrationStyle: "outline",
  auth: {
    sections: [[{"type":"external_wallets","walletConnect":{"projectId":"your-project-id"}}]],
    addPasskeyOnSignup: false,
  },
};

export const config = createConfig({
  // if you don't want to leak api keys, you can proxy to a backend and set the rpcUrl instead here
  // get this from the app config you create at https://dashboard.alchemy.com/accounts
  transport: alchemy({ apiKey: "X2GPLkmNtw0oJdo8mTD5ALbSbhjgXZk7" }),
  chain: sepolia,
  ssr: true, // set to false if you're not using server-side rendering
enablePopupOauth: true,
}, uiConfig);

export const queryClient = new QueryClient();