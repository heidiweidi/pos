"use client";

import { useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { CURRENCIES, CURRENCY_CODES, defaultsFor, type CurrencyCode, type RegionSettings } from "@/lib/region";
import { usePos } from "@/lib/store/pos-store";
import { useRegion } from "@/lib/store/region-store";
import { useSession } from "@/lib/store/session-store";

/** Manager-only: currency, tax rate and statutory discounts. */
export function RegionAdmin() {
  const { cashier } = useSession();
  const { region, saveRegion } = useRegion();
  const { showToast } = usePos();
  const [draft, setDraft] = useState<RegionSettings>(region);
  const [saving, setSaving] = useState(false);

  if (cashier?.role !== "manager") {
    return (
      <div className="p-space-md max-w-xl mx-auto w-full">
        <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm text-center flex flex-col items-center gap-space-sm">
          <Icon name="lock" className="text-4xl text-outline" />
          <h1 className="font-headline-sm text-headline-sm text-on-surface">Manager access required</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Currency and tax settings can only be changed by a manager account.
          </p>
        </div>
      </div>
    );
  }

  const info = CURRENCIES[draft.currency];
  const isVat = info.taxMode === "vat";
  const dirty = JSON.stringify(draft) !== JSON.stringify(region);
  const valid =
    Number.isFinite(draft.taxRatePct) &&
    draft.taxRatePct >= 0 &&
    draft.taxRatePct <= 100 &&
    Number.isFinite(draft.seniorPwdPct) &&
    draft.seniorPwdPct >= 0 &&
    draft.seniorPwdPct <= 100;

  const pickCurrency = (code: CurrencyCode) => setDraft(defaultsFor(code));

  async function save() {
    setSaving(true);
    try {
      await saveRegion(draft);
      showToast({ title: "Currency & tax saved", detail: `${draft.currency} is now active`, tone: "success" });
    } catch (error) {
      console.error("[RegionAdmin] save failed:", error);
      showToast({
        title: "Couldn't save the change",
        detail: "Check the connection (and that supabase/addons.sql has been run).",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  const card = "bg-surface-container-lowest rounded-xl p-space-md shadow-sm";
  const input =
    "w-28 h-11 px-3 bg-surface-container-low rounded-lg font-label-lg text-label-lg text-on-surface text-right focus:outline-none focus:bg-surface-container-lowest shadow-inner";

  return (
    <div className="p-space-md flex flex-col gap-space-md max-w-3xl mx-auto w-full">
      <div className={card}>
        <h1 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-space-xs">
          <Icon name="payments" className="text-primary" />
          Currency &amp; Tax
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
          Sets the currency symbol, the tax system and any statutory discounts for every cashier. Prices are not
          converted — re-price the catalog in Manage Products after changing currency.
        </p>
      </div>

      <div className={`${card} flex flex-col gap-space-sm`}>
        <span className="font-label-lg text-label-lg text-on-surface">Currency</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
          {CURRENCY_CODES.map((code) => {
            const c = CURRENCIES[code];
            const on = draft.currency === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => pickCurrency(code)}
                aria-pressed={on}
                className={`p-space-sm rounded-xl text-left border-2 transition-colors ${
                  on
                    ? "bg-primary-container text-on-primary-container border-primary"
                    : "bg-surface-container-low border-transparent hover:bg-surface-container"
                }`}
              >
                <div className="font-headline-sm text-headline-sm">
                  {c.symbol} {c.code}
                </div>
                <div className="font-body-sm text-body-sm opacity-80">
                  {c.name} • {c.taxMode === "vat" ? "VAT-inclusive prices" : "sales tax added at checkout"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className={`${card} flex flex-col gap-space-md`}>
        <span className="font-label-lg text-label-lg text-on-surface">{isVat ? "Value-Added Tax" : "Sales Tax"}</span>

        {isVat ? (
          <label className="flex items-center justify-between gap-space-md">
            <span>
              <span className="font-label-md text-label-md text-on-surface block">VAT-registered business</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Off for non-VAT businesses: no VAT is shown, prices are left as they are.
              </span>
            </span>
            <input
              type="checkbox"
              checked={draft.vatRegistered}
              onChange={(e) => setDraft((d) => ({ ...d, vatRegistered: e.target.checked }))}
              className="w-6 h-6 accent-primary"
            />
          </label>
        ) : null}

        {!isVat || draft.vatRegistered ? (
          <label className="flex items-center justify-between gap-space-md">
            <span>
              <span className="font-label-md text-label-md text-on-surface block">{info.taxName} rate (%)</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {isVat
                  ? "Shelf prices already include VAT. Items flagged V are VATable; E items are VAT-exempt (e.g. fresh produce, basic goods)."
                  : "Added on top of taxable (T) items. Food (F) is exempt."}
              </span>
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step="0.01"
              value={Number.isFinite(draft.taxRatePct) ? draft.taxRatePct : ""}
              onChange={(e) => setDraft((d) => ({ ...d, taxRatePct: e.target.valueAsNumber }))}
              className={input}
            />
          </label>
        ) : null}
      </div>

      {info.discounts.length > 0 ? (
        <div className={`${card} flex flex-col gap-space-md`}>
          <span className="font-label-lg text-label-lg text-on-surface">Senior Citizen &amp; PWD Discount</span>
          <label className="flex items-center justify-between gap-space-md">
            <span>
              <span className="font-label-md text-label-md text-on-surface block">Discount rate (%)</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Statutory rate is 20%. Computed on the VAT-exclusive price, with the VAT exempted. The cashier
                records the customer&apos;s ID on every use.
              </span>
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step="0.01"
              value={Number.isFinite(draft.seniorPwdPct) ? draft.seniorPwdPct : ""}
              onChange={(e) => setDraft((d) => ({ ...d, seniorPwdPct: e.target.valueAsNumber }))}
              className={input}
            />
          </label>
        </div>
      ) : null}

      <div className="flex justify-end gap-space-xs">
        <button
          type="button"
          onClick={() => setDraft(region)}
          disabled={!dirty || saving}
          className="h-12 px-space-md rounded-lg bg-surface-container text-on-surface font-label-md text-label-md disabled:opacity-50"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => void save()}
          disabled={!dirty || !valid || saving}
          className="h-12 px-space-lg rounded-lg bg-primary text-on-primary font-label-lg text-label-lg disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
