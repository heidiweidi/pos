"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { FAST_KEY_TABS, PRODUCT_BY_ID } from "@/lib/data/catalog";
import { formatMoney } from "@/lib/money";
import { usePos } from "@/lib/store/pos-store";
import type { Product } from "@/lib/types";

/** Centre column: scan dock, department tabs, 3-up fast-key tile grid. */
export function FastKeyDeck() {
  const router = useRouter();
  const { scanCode, addProduct, showToast } = usePos();
  const [code, setCode] = useState("");
  const [tabId, setTabId] = useState(FAST_KEY_TABS[0].id);
  const inputRef = useRef<HTMLInputElement>(null);

  const tiles = useMemo(() => {
    const tab = FAST_KEY_TABS.find((t) => t.id === tabId) ?? FAST_KEY_TABS[0];
    return tab.productIds
      .map((id) => PRODUCT_BY_ID.get(id))
      .filter((p): p is Product => Boolean(p));
  }, [tabId]);

  const submit = async () => {
    const value = code.trim();
    if (!value) return;
    setCode("");
    const product = await scanCode(value);
    inputRef.current?.focus();
    // Weighed items can't be priced without the scale, so hand off to the dock.
    if (product?.pricingMode === "scale") {
      router.push(`/plu?plu=${product.plu ?? ""}`);
    }
  };

  const tapTile = (product: Product) => {
    if (product.pricingMode === "scale") {
      router.push(`/plu?plu=${product.plu ?? ""}`);
      return;
    }
    addProduct(product, { qty: 1 });
    showToast({
      title: `Added ${product.name}`,
      detail: formatMoney(product.unitPrice),
      tone: "success",
    });
  };

  return (
    <div className="col-span-12 lg:col-span-4 flex flex-col h-full gap-space-sm overflow-hidden">
      {/* Barcode / PLU entry dock */}
      <div className="bg-surface-container-lowest p-space-sm rounded-xl shadow-md flex items-center gap-space-sm shrink-0">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-on-surface-variant">
            <Icon name="barcode_scanner" />
          </span>
          <input
            ref={inputRef}
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submit();
              }
            }}
            className="w-full h-12 pl-11 pr-3 bg-surface-container-low rounded-lg font-label-lg text-label-lg text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest shadow-inner"
            placeholder="Scan Barcode / Enter PLU (e.g. 4011)"
            type="text"
            inputMode="numeric"
            aria-label="Scan barcode or enter PLU"
          />
        </div>
        <button
          type="button"
          onClick={() => void submit()}
          className="h-12 px-space-md bg-primary-container text-on-primary-container rounded-lg font-label-lg text-label-lg hover:bg-primary transition-all flex items-center gap-1 shadow-sm active:translate-y-0.5"
        >
          <span>Enter</span>
          <Icon name="subdirectory_arrow_left" className="text-lg" />
        </button>
      </div>

      {/* Department tabs */}
      <div className="flex items-center gap-space-xs overflow-x-auto no-scrollbar shrink-0 py-0.5">
        {FAST_KEY_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTabId(tab.id)}
            className={`px-space-md py-2 rounded-lg font-label-md text-label-md shadow-sm whitespace-nowrap transition-colors ${
              tab.id === tabId
                ? "bg-primary text-on-primary"
                : "bg-surface-container-lowest text-on-surface hover:bg-surface-container-high"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Fast-key tiles */}
      <div className="flex-1 bg-surface-container-lowest p-space-sm rounded-xl shadow-md overflow-y-auto pos-scroll">
        <div className="grid grid-cols-3 gap-space-xs">
          {tiles.map((product, index) => {
            const isScale = product.pricingMode === "scale";
            return (
              <button
                key={`${product.id}-${index}`}
                type="button"
                onClick={() => tapTile(product)}
                className="h-24 bg-surface-container-lowest hover:bg-surface-container-low transition-all rounded-lg p-space-xs flex flex-col justify-between text-left shadow-tile active:translate-y-0.5 relative"
              >
                <div className="flex items-start justify-between w-full">
                  <Icon
                    name={product.icon ?? "inventory_2"}
                    className={`text-xl ${product.iconClass ?? "text-outline"}`}
                  />
                  {isScale ? (
                    <span className="bg-primary/10 text-primary px-1 rounded font-label-sm text-label-sm flex items-center gap-0.5">
                      <Icon name="scale" className="text-xs" /> {product.unitLabel}
                    </span>
                  ) : (
                    <span className="font-numeric-md text-numeric-md font-bold text-on-surface">
                      {product.promoLabel ?? formatMoney(product.unitPrice)}
                    </span>
                  )}
                </div>
                <div className="w-full min-w-0">
                  <div className="font-label-md text-label-md text-on-surface truncate">
                    {product.name}
                  </div>
                  {isScale ? (
                    <div className="font-numeric-md text-numeric-md text-primary font-bold truncate">
                      {formatMoney(product.unitPrice)}/lb{" "}
                      <span className="font-body-sm text-body-sm text-on-surface-variant font-normal">
                        ({product.plu})
                      </span>
                    </div>
                  ) : (
                    <div className="font-label-sm text-label-sm text-on-surface-variant truncate">
                      {product.subtitle ?? product.department} •{" "}
                      {product.plu
                        ? `PLU ${product.plu}`
                        : product.sku
                          ? `SKU ${product.sku}`
                          : product.department}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
