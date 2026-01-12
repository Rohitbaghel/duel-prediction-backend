// hooks/blockchain/useMatchReads.ts
import { useMatchContract } from "./useMatchContract";
import { Address, MarketData, Outcome, UserShares } from "./types";

export function useMatchReads(matchId: number, user?: Address) {
  const { publicClient, contract } = useMatchContract();

  async function getMarket(): Promise<MarketData> {
    return publicClient.readContract({
      ...contract,
      functionName: "getMarketData",
      args: [matchId],
    }) as Promise<MarketData>;
  }

  async function getAllShares(): Promise<UserShares> {
    return publicClient.readContract({
      ...contract,
      functionName: "getAllShares",
      args: [matchId, user],
    }) as Promise<UserShares>;
  }

  async function canClaim(): Promise<boolean> {
    return publicClient.readContract({
      ...contract,
      functionName: "canClaim",
      args: [matchId, user],
    }) as Promise<boolean>;
  }

  async function getPotentialReward(outcome: Outcome): Promise<string> {
    return publicClient.readContract({
      ...contract,
      functionName: "getPotentialReward",
      args: [matchId, outcome, user],
    }) as Promise<string>;
  }

  return { getMarket, getAllShares, canClaim, getPotentialReward };
}
