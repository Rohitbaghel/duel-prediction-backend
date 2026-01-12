import { useWalletClient, usePublicClient } from "wagmi";
import { PredictionMarketABI } from "../../../contracts/PredictionMarketABI";
import { Address } from "./types";

export const CONTRACT_ADDRESS = import.meta.env
  .VITE_PREDICTION_MARKET_ADDRESS as Address;

export function useMatchContract() {
  const { data: wallet } = useWalletClient();
  const publicClient = usePublicClient();

  if (!wallet) throw new Error("Wallet not connected");
  if (!publicClient) throw new Error("Public client not ready");

  return {
    wallet,
    publicClient,
    contract: {
      address: CONTRACT_ADDRESS,
      abi: PredictionMarketABI,
    },
  };
}
