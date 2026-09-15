import { computeTotals, formatMoney, lineNet } from "../src/lib/money";
import { DEMO_CART, DEMO_MEMBER } from "../src/lib/data/session";
import { PRODUCT_BY_ID } from "../src/lib/data/catalog";
import { buildLine } from "../src/lib/store/pos-store";

let fails = 0;
const check = (name: string, got: string | number, want: string | number) => {
  const ok = String(got) === String(want);
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name.padEnd(26)} got ${String(got).padEnd(10)} want ${want}`);
};

console.log("=== seeded cart vs design tape ===");
const tape = ["$5.00","$3.79","$5.83","$14.94","$4.49","$4.29","$2.15","$6.59"];
DEMO_CART.forEach((l: (typeof DEMO_CART)[number], i: number) => check(`line ${i + 1} ${l.name.slice(0, 14)}`, formatMoney(lineNet(l)), tape[i]));

const t = computeTotals(DEMO_CART, DEMO_MEMBER);
console.log("\n=== footer ===");
check("cart subtotal", formatMoney(t.subtotal), "$47.08");
check("SNAP eligible portion", formatMoney(t.ebtEligible), "$40.49");
check("item count", t.itemCount, 8);
check("total weight lb", t.totalWeightLb, 6.61);
check("line discounts", formatMoney(t.discounts), "$1.00");
console.log(`      tax                        ${formatMoney(t.tax)}`);
console.log(`      deposits                   ${formatMoney(t.deposits)}`);
console.log(`      TOTAL                      ${formatMoney(t.total)}   (= subtotal + tax, balances)`);
check("total balances", formatMoney(t.subtotal + t.tax), formatMoney(t.total));

console.log("\n=== member reward application ===");
const withReward = computeTotals(DEMO_CART, { ...DEMO_MEMBER, couponsApplied: [{ label: "Reward", amount: 500 }] });
check("total drops by reward", formatMoney(t.total - withReward.total), "$5.00");

console.log("\n=== scale pricing ===");
const apples = PRODUCT_BY_ID.get("p-3283")!;
// The PLU directory card prices Honeycrisp at $2.99/lb, so that is the catalog
// price. The seeded register tape shows a $2.49/lb line — a historical price
// frozen at scan time, which is exactly what the denormalised line model is for.
const l1 = buildLine(apples, { weightLb: 2.34, tareLb: 0.02 });
check("2.34lb @ $2.99/lb (catalog)", formatMoney(lineNet(l1)), "$7.00");
check("detail line", l1.detail, "2.34 lb @ $2.99/lb • Tare 0.02 lb • PLU 3283");
check("seeded line keeps its own price", formatMoney(lineNet(DEMO_CART[2])), "$5.83");

const avo = PRODUCT_BY_ID.get("p-4225")!;
check("4 avocados @ $1.25", formatMoney(lineNet(buildLine(avo, { qty: 4 }))), "$5.00");

console.log("\n=== deposits are untaxed ===");
const water = PRODUCT_BY_ID.get("p-sparkling")!;
const wLine = buildLine(water, { qty: 1 });
const wt = computeTotals([wLine]);
check("water line total", formatMoney(lineNet(wLine)), "$6.59");
check("tax on base only (5.99)", formatMoney(wt.tax), "$0.37");

console.log("\n=== voids ===");
const voided = computeTotals(DEMO_CART.map((l: (typeof DEMO_CART)[number], i: number) => (i === 3 ? { ...l, voided: true } : l)), DEMO_MEMBER);
check("voiding salmon drops total", formatMoney(t.total - voided.total), "$14.94");

console.log(fails === 0 ? "\n✅ ALL CHECKS PASS" : `\n❌ ${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);
