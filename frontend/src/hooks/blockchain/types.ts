export type Address = `0x${string}`;

export type Outcome = 1 | 2 | 3;

export interface MarketData {
  status: number;
  winningOutcome: Outcome;
  totalPool: string;
  p1Shares: string;
  p2Shares: string;
  drawShares: string;
}

export interface UserShares {
  p1Shares: string;
  p2Shares: string;
  drawShares: string;
}

export interface TxResult {
  hash: `0x${string}`;
}
