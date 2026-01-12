// hooks/blockchain/useMatchActions.ts
import { parseEther } from "viem";
import { useMatchContract } from "./useMatchContract";
import { Address, Outcome, TxResult } from "./types";

export function useMatchActions() {
  const { wallet, contract } = useMatchContract();

  async function createMatch(
    matchId: number,
    player1: Address,
    player2: Address,
    amount: string
  ): Promise<TxResult> {
    const hash = await wallet.writeContract({
      ...contract,
      functionName: "createMatch",
      args: [matchId, player1, player2],
      value: parseEther(amount),
    });

    return { hash };
  }

  async function joinMatch(matchId: number, amount: string): Promise<TxResult> {
    const hash = await wallet.writeContract({
      ...contract,
      functionName: "joinMatch",
      args: [matchId],
      value: parseEther(amount),
    });
    return { hash };
  }

  async function bet(
    matchId: number,
    outcome: Outcome,
    amount: string
  ): Promise<TxResult> {
    const hash = await wallet.writeContract({
      ...contract,
      functionName: "betOnMatch",
      args: [matchId, outcome],
      value: parseEther(amount),
    });
    return { hash };
  }

  async function claim(matchId: number): Promise<TxResult> {
    const hash = await wallet.writeContract({
      ...contract,
      functionName: "claimReward",
      args: [matchId],
    });
    return { hash };
  }

  return { createMatch, joinMatch, bet, claim };
}
