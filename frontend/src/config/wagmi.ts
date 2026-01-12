// web3/wagmi.ts
import { http } from "wagmi";
import { createConfig } from "@privy-io/wagmi";
import { mantleSepolia } from "./chains";

export const wagmiConfig = createConfig({
  chains: [mantleSepolia],
  transports: {
    [mantleSepolia.id]: http(),
  },
});
