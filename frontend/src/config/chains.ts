import { type Chain } from "viem";

export const mantleSepolia = {
  id: 1,
  name: "Mantle Testnet",
  nativeCurrency: { name: "MNT", symbol: "MNT", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        "https://mantle-sepolia.g.alchemy.com/v2/6t-67_9ZObtkyunig8Uq4GpmEg49GwxV",
      ],
    },
  },
  blockExplorers: {
    default: { name: "Mantel", url: "https://explore.testnet.mantle.xyz" },
  },
} as const satisfies Chain;
