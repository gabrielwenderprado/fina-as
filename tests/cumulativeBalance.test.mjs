import assert from "node:assert/strict";
import test from "node:test";
import { calculateCumulativeBalance } from "../src/lib/cumulativeBalance.js";

const entriesThroughOctober = [
  { period: "2026-09", type: "income", amountCents: 100_000 },
  { period: "2026-09", type: "fixed", amountCents: 50_000 },
  { period: "2026-10", type: "income", amountCents: 150_000 },
  { period: "2026-10", type: "expense", amountCents: 50_000 },
];

test("acumula o saldo de setembro e outubro ao consultar novembro", () => {
  assert.equal(calculateCumulativeBalance(entriesThroughOctober, "2026-11"), 150_000);
});

test("uma conta lançada no mês atual reduz o saldo acumulado imediatamente", () => {
  const entriesWithNovemberBill = [
    ...entriesThroughOctober,
    { period: "2026-11", type: "fixed", amountCents: 10_000 },
  ];
  assert.equal(calculateCumulativeBalance(entriesWithNovemberBill, "2026-11"), 140_000);
});

test("ignora meses posteriores ao mês atual e não inclui mês filtrado na função", () => {
  const entriesWithFutureExpense = [
    ...entriesThroughOctober,
    { period: "2026-12", type: "expense", amountCents: 80_000 },
  ];
  assert.equal(calculateCumulativeBalance(entriesWithFutureExpense, "2026-11"), 150_000);
});

test("retorna zero quando ainda não há lançamentos até ao mês atual", () => {
  assert.equal(calculateCumulativeBalance([], "2026-11"), 0);
});
