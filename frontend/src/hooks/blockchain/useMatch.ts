// hooks/blockchain/useMatch.ts
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { Address, MarketData, UserShares } from "./types";
import { useMatchActions } from "./useMatchActions";
import { useMatchReads } from "./useMatchReads";

export function useMatch(matchId: number) {
  const { address } = useAccount();
  const actions = useMatchActions();
  const reads = useMatchReads(matchId, address as Address);

  const [market, setMarket] = useState<MarketData | null>(null);
  const [user, setUser] = useState<UserShares | null>(null);
  const [canClaim, setCanClaim] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function refresh() {
    try {
      setLoading(true);
      const [m, u, c] = await Promise.all([
        reads.getMarket(),
        reads.getAllShares(),
        reads.canClaim(),
      ]);

      setMarket(m);
      setUser(u);
      setCanClaim(c);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (matchId && address) refresh();
  }, [matchId, address]);

  return {
    ...actions,
    market,
    user,
    canClaim,
    getPotentialReward: reads.getPotentialReward,
    refresh,
    isLoading,
    error,
  };
}
