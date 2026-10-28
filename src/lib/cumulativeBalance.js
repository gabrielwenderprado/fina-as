/**
 * @typedef {{ period: string, type: "income" | "fixed" | "expense", amountCents: number }} BalanceEntry
 */

/**
 * Soma o resultado líquido de cada mês até ao mês de corte, inclusive.
 * Os períodos YYYY-MM podem ser comparados alfabeticamente em ordem cronológica.
 * @param {readonly BalanceEntry[]} entries
 * @param {string} throughPeriod
 * @returns {number}
 */
export function calculateCumulativeBalance(entries, throughPeriod) {
  return entries.reduce((balance, entry) => {
    if (entry.period > throughPeriod) return balance;
    return balance + (entry.type === "income" ? entry.amountCents : -entry.amountCents);
  }, 0);
}
