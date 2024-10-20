/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "circomlibjs";

// global.d.ts
interface Window {
  ethereum?: {
    isMetaMask?: boolean;
    request: (args: { method: string; params?: any[] }) => Promise<any>;
    on: (eventName: string, handler: (...args: any[]) => void) => void;
  };
}
