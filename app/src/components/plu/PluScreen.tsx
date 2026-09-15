"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { PluCard } from "./PluCard";
import { ScaleDock } from "./ScaleDock";
import { Icon } from "@/components/ui/Icon";
import {
  PLU_CATEGORIES,
  PLU_GRID_IDS,
  PLU_SPEED_KEYS,
  PRODUCTS,
  PRODUCT_BY_ID,
  searchProducts,
} from "@/lib/data/catalog";
import { TARE_PRESETS } from "@/lib/data/session";
import { formatMoney, formatWeight, roundCents } from "@/lib/money";
import { buildLine, usePos } from "@/lib/store/pos-store";
import type { Product } from "@/lib/types";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const GRID_PRODUCTS = PLU_GRID_IDS.map((id) => PRODUCT_BY_ID.get(id)).filter(
  (p): p is Product => Boolean(p),
);

export function PluScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const { addLine, showToast, scale, setScale } = usePos();

  const [query, setQuery] = useState("");
  const [letter, setLetter] = useState("ALL");
  const [category, setCategory] = useState("all");
  const [qty, setQty] = useState("1");

  // Arriving from a fast key or a scanned weighed item preselects that PLU.
  const pluParam = params.get("plu");
  const paramProduct = pluParam ? PRODUCTS.find((p) => p.plu === pluParam) : undefined;

  const [selectedId, setSelectedId] = useState<string>(
    () => paramProduct?.id ?? GRID_PRODUCTS[3]?.id ?? GRID_PRODUCTS[0].id,
  );

  /*
   * If the cashier is already on this screen and taps another weighed fast key,
   * only the query string changes — the component stays mounted, so the
   * initialiser above won't re-run. Adjusting state during render (rather than
   * in an effect) is React's sanctioned pattern for this: it re-renders
   * immediately, before the browser paints, with no flash of the stale item.
   */
  const [lastPlu, setLastPlu] = useState(pluParam);
  if (pluParam !== lastPlu) {
    setLastPlu(pluParam);
    if (paramProduct) {
      setSelectedId(paramProduct.id);
      setQty("1");
    }
  }

  const selected = PRODUCT_BY_ID.get(selectedId) ?? GRID_PRODUCTS[0];
  const isScaleItem = selected.pricingMode === "scale";
  const netWeight = Math.max(0, scale.grossLb - scale.tareLb);
  const count = Math.max(1, Number.parseInt(qty, 10) || 1);

  const itemTotal = isScaleItem
    ? roundCents(netWeight * selected.unitPrice)
    : count * selected.unitPrice;

  const visible = useMemo(() => {
    let list = searchProducts(query, GRID_PRODUCTS);
    if (category !== "all") {
      list = list.filter((p) => p.categories?.includes(category));
    }
    if (letter !== "ALL") {
      list = list.filter((p) => p.name.toUpperCase().startsWith(letter));
    }
    return list;
  }, [query, category, letter]);

  const selectProduct = (product: Product) => {
    setSelectedId(product.id);
    setQty("1");
  };

  const pressKey = (value: string) => {
    setQty((prev) => {
      const next = prev === "0" || prev === "1" ? value : prev + value;
      return next.slice(0, 3);
    });
  };

  const pushToCart = () => {
    if (isScaleItem && netWeight <= 0) {
      showToast({ title: "Place the item on the scale", detail: "Net weight is zero", tone: "warning" });
      return;
    }
    const line = buildLine(selected, {
      qty: count,
      weightLb: isScaleItem ? netWeight : undefined,
      tareLb: isScaleItem && scale.tareLb > 0 ? scale.tareLb : undefined,
    });
    addLine(line);
    showToast({
      title: `Added to Lane cart: ${selected.name}`,
      detail: isScaleItem
        ? `${formatWeight(netWeight)} lb @ ${formatMoney(selected.unitPrice)}/lb • Total ${formatMoney(itemTotal)}`
        : `${count} × ${formatMoney(selected.unitPrice)} • Total ${formatMoney(itemTotal)}`,
      tone: "success",
    });
    router.push("/register");
  };

  return (
    <div className="p-space-md grid grid-cols-12 gap-space-md max-w-[1920px] mx-auto w-full">
      {/* LEFT: search, filters, produce grid */}
      <div className="col-span-12 xl:col-span-8 2xl:col-span-9 flex flex-col gap-space-md">
        <div className="bg-surface-container-lowest p-space-md rounded shadow-sm flex flex-col gap-space-sm">
          <div className="flex items-center gap-space-md">
            <div className="relative flex-1">
              <Icon
                name="search"
                className="absolute left-space-md top-1/2 -translate-y-1/2 text-outline text-xl"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full h-12 pl-12 pr-12 bg-surface-container-low rounded font-body-lg text-body-lg text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:shadow-md transition-all"
                placeholder="Search by name e.g. Honeycrisp, or 4-digit PLU e.g. 4011..."
                type="text"
                aria-label="Search produce catalog"
              />
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-space-sm top-1/2 -translate-y-1/2 w-8 h-8 rounded flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors"
                aria-label="Clear search"
              >
                <Icon name="close" className="text-lg" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => router.push("/register")}
              className="h-12 px-space-md bg-surface-container-high text-on-surface rounded font-label-md text-label-md flex items-center gap-space-xs hover:bg-surface-variant transition-colors shrink-0 shadow-sm"
            >
              <Icon name="arrow_back" className="text-base" />
              <span>Return to Lane 04</span>
            </button>
          </div>

          {/* A–Z jump strip */}
          <div className="flex items-center gap-1 overflow-x-auto py-1 text-on-surface-variant select-none no-scrollbar">
            <button
              type="button"
              onClick={() => setLetter("ALL")}
              className={`px-2 py-1 rounded font-label-sm text-label-sm shrink-0 ${
                letter === "ALL"
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-low hover:bg-surface-container-high"
              }`}
            >
              ALL
            </button>
            {ALPHABET.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLetter(l === letter ? "ALL" : l)}
                className={`px-2.5 py-1 rounded font-label-sm text-label-sm shrink-0 ${
                  letter === l
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-low hover:bg-surface-container-high"
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Category pills */}
          <div className="flex items-center gap-space-xs overflow-x-auto pb-1 no-scrollbar">
            {PLU_CATEGORIES.map((cat) => {
              const active = cat.id === category;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`flex items-center gap-space-xs px-space-md py-space-xs rounded font-label-md text-label-md shrink-0 transition-colors shadow-sm ${
                    active
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container-low hover:bg-surface-container text-on-surface"
                  }`}
                >
                  {cat.dot ? (
                    <span className={`w-2 h-2 rounded-full ${active ? "bg-on-primary" : "bg-primary"}`} />
                  ) : null}
                  <span>{cat.label}</span>
                  {cat.count ? (
                    <span
                      className={`px-1.5 py-0.5 rounded text-label-sm font-label-sm ${
                        active
                          ? "bg-primary-container text-on-primary-container"
                          : "bg-surface-container-high text-on-surface-variant"
                      }`}
                    >
                      {cat.count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Produce grid */}
        {visible.length === 0 ? (
          <div className="bg-surface-container-lowest rounded shadow-sm p-space-xl flex flex-col items-center gap-space-xs text-on-surface-variant">
            <Icon name="search_off" className="text-4xl text-outline-variant" />
            <p className="font-label-md text-label-md">No produce matches that filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-space-md">
            {visible.map((product) => (
              <PluCard
                key={product.id}
                product={product}
                selected={product.id === selectedId}
                onSelect={() => selectProduct(product)}
              />
            ))}
          </div>
        )}

        {/* Speed keys + catalog status */}
        <div className="bg-surface-container-lowest p-space-md rounded shadow-sm flex flex-wrap items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-sm flex-wrap">
            <span className="font-label-md text-label-md text-on-surface">Common PLU Speed-Keys:</span>
            <div className="flex items-center gap-space-xs flex-wrap">
              {PLU_SPEED_KEYS.map((key) => (
                <button
                  key={key.plu}
                  type="button"
                  onClick={() => {
                    const match = PRODUCTS.find((p) => p.plu === key.plu);
                    if (match) {
                      setQuery("");
                      setCategory("all");
                      setLetter("ALL");
                      selectProduct(match);
                    }
                  }}
                  className="px-space-sm py-1 rounded bg-surface-container-low hover:bg-surface-container text-on-surface font-label-sm text-label-sm font-semibold"
                >
                  {key.plu} {key.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-space-sm font-label-sm text-label-sm text-on-surface-variant">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary" /> Catalog synced 2m ago
            </span>
            <span>•</span>
            <span>Database: US_PLU_REV2024</span>
          </div>
        </div>
      </div>

      {/* RIGHT: scale dock, live math, numpad, push-to-cart */}
      <div className="col-span-12 xl:col-span-4 2xl:col-span-3 flex flex-col gap-space-md">
        <ScaleDock
          grossLb={scale.grossLb}
          tareLb={scale.tareLb}
          stable={scale.stable}
          active={isScaleItem}
          presets={TARE_PRESETS}
          onTare={(lb) => setScale({ tareLb: lb })}
          onZero={() => setScale({ grossLb: 0, tareLb: 0, stable: true })}
          onManualWeight={(lb) => setScale({ grossLb: lb, stable: true })}
        />

        {/* Active selection + math breakdown */}
        <div className="bg-surface-container-lowest p-space-md rounded shadow-sm flex flex-col gap-space-sm">
          <div className="flex items-start justify-between gap-space-sm">
            <div className="min-w-0">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
                Active Selection
              </span>
              <h2 className="font-headline-md text-headline-md text-on-surface leading-tight truncate">
                {selected.name}
              </h2>
              <div className="flex items-center gap-space-sm mt-0.5 flex-wrap">
                <span className="bg-primary text-on-primary font-label-sm text-label-sm px-1.5 py-0.5 rounded">
                  PLU #{selected.plu ?? "—"}
                </span>
                <span className="font-body-md text-body-md text-on-surface-variant">
                  {formatMoney(selected.unitPrice)} per {selected.unitLabel}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded bg-surface-container flex items-center justify-center shrink-0">
              <Icon name={selected.icon ?? "nutrition"} className="text-primary text-2xl" />
            </div>
          </div>

          <div className="bg-surface-container-low p-space-md rounded flex flex-col gap-space-xs mt-space-xs">
            <div className="flex justify-between items-center font-body-md text-body-md text-on-surface-variant gap-space-sm">
              <span>
                {isScaleItem
                  ? `${formatWeight(netWeight)} lb @ ${formatMoney(selected.unitPrice)} / lb`
                  : `${count} count @ ${formatMoney(selected.unitPrice)} each`}
              </span>
              <span className="font-label-sm text-label-sm text-outline whitespace-nowrap">
                Dept {selected.departmentCode} - {selected.taxFlag === "F" ? "Tax Exempt" : "Taxable"}
              </span>
            </div>
            <div className="flex justify-between items-baseline pt-1">
              <span className="font-label-lg text-label-lg text-on-surface">Item Total:</span>
              <span className="font-numeric-lg text-numeric-lg text-primary font-bold">
                {formatMoney(itemTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Count / manual qty numpad */}
        <div className="bg-surface-container-lowest p-space-md rounded shadow-sm flex flex-col gap-space-sm">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-on-surface">Count / Manual Qty</span>
            <div className="flex items-center gap-space-xs">
              <span className="font-label-sm text-label-sm text-outline">Qty:</span>
              <input
                readOnly
                value={qty}
                className="w-16 h-8 text-right bg-surface-container-low px-2 rounded font-numeric-md text-numeric-md text-on-surface focus:outline-none"
                aria-label="Quantity"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-space-xs">
            {["7", "8", "9", "4", "5", "6", "1", "2", "3"].map((key) => (
              <NumKey key={key} label={key} onClick={() => pressKey(key)} />
            ))}
            <button
              type="button"
              onClick={() => setQty("1")}
              className="h-12 rounded bg-error-container text-on-error-container hover:bg-error/20 font-label-md text-label-md flex items-center justify-center transition-colors"
            >
              CLR
            </button>
            <NumKey label="0" onClick={() => pressKey("0")} />
            <NumKey label="00" onClick={() => pressKey("00")} small />
          </div>
        </div>

        {/* Push to cart */}
        <div className="flex flex-col gap-space-xs mt-auto">
          <button
            type="button"
            onClick={pushToCart}
            className="h-16 w-full bg-primary hover:bg-primary-container text-on-primary rounded font-headline-md text-headline-md flex items-center justify-between px-space-md shadow-md hover:shadow-lg transition-all"
          >
            <div className="flex items-center gap-space-xs">
              <Icon name="shopping_cart_checkout" className="text-2xl" />
              <span>Confirm &amp; Push</span>
            </div>
            <span className="font-numeric-lg text-numeric-lg font-bold bg-primary-container px-space-sm py-1 rounded text-on-primary-container">
              {formatMoney(itemTotal)}
            </span>
          </button>

          <div className="grid grid-cols-2 gap-space-xs">
            <button
              type="button"
              onClick={() =>
                showToast({
                  title: `Price check: ${selected.name}`,
                  detail: `${formatMoney(selected.unitPrice)} / ${selected.unitLabel} • no active promotion`,
                  tone: "success",
                })
              }
              className="h-11 bg-surface-container-low hover:bg-surface-container text-on-surface rounded font-label-md text-label-md flex items-center justify-center gap-space-xs transition-colors"
            >
              <Icon name="price_check" className="text-base" />
              <span>Check Price</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const code = window.prompt("Enter 4 or 5 digit produce PLU:");
                if (code) setQuery(code.trim());
              }}
              className="h-11 bg-surface-container-low hover:bg-surface-container text-on-surface rounded font-label-md text-label-md flex items-center justify-center gap-space-xs transition-colors"
            >
              <Icon name="dialpad" className="text-base" />
              <span>Manual PLU</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NumKey({
  label,
  onClick,
  small = false,
}: {
  label: string;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-12 rounded bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center justify-center transition-colors ${
        small ? "font-label-md text-label-md" : "font-headline-sm text-headline-sm"
      }`}
    >
      {label}
    </button>
  );
}
