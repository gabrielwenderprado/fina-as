export type BalanceEntry = {
  period: string;
  type: "income" | "fixed" | "expense";
  amountCents: number;
};

export function calculateCumulativeBalance(
  entries: readonly BalanceEntry[],
  throughPeriod: string,
): number;
