"use client";

import { Icon } from "@/components/ui/Icon";
import { ProduceArt } from "@/components/ui/ProduceArt";
import { formatMoney } from "@/lib/money";
import type { Product } from "@/lib/types";

/** PLU chip colour encodes how the item is priced, as in the source design. */
function chipClass(product: Product, selected: boolean): string {
  if (selected) return "bg-surface-container-high text-on-surface";
  if (product.organic) return "bg-primary-container text-on-primary-container";
  if (product.pricingMode === "count") return "bg-secondary-container text-on-secondary-fixed";
  return "bg-primary text-on-primary";
}

export function PluCard({
  product,
  selected,
  onSelect,
}: {
  product: Product;
  selected: boolean;
  onSelect: () => void;
}) {
  const isScale = product.pricingMode === "scale";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`cursor-pointer p-space-md rounded shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group ${
        selected
          ? "bg-surface-container-high/40 ring-2 ring-primary"
          : "bg-surface-container-lowest"
      }`}
    >
      <div className="flex items-start justify-between gap-space-xs">
        <span
          className={`font-label-md text-label-md px-space-sm py-0.5 rounded shadow-sm ${chipClass(
            product,
            selected,
          )}`}
        >
          #{product.plu}
        </span>
        <span
          className={`flex items-center gap-1 font-label-sm text-label-sm px-space-xs py-0.5 rounded text-on-surface ${
            isScale ? "bg-surface-container" : "bg-surface-container-low"
          }`}
        >
          <Icon
            name={isScale ? "scale" : "tag"}
            className={`text-xs ${isScale ? "text-primary" : "text-secondary"}`}
          />
          {isScale ? "Scale Req" : "By Count"}
        </span>
      </div>

      <div className="py-space-sm flex justify-center items-center">
        <ProduceArt
          art={product.art}
          className="w-24 h-24 object-contain transition-transform group-hover:scale-105"
        />
      </div>

      <div>
        <div className="flex items-center gap-1">
          {product.organic ? <span className="w-2 h-2 rounded-full bg-primary shrink-0" /> : null}
          <h3 className="font-headline-sm text-headline-sm text-on-surface truncate">
            {product.name}
          </h3>
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
          {product.subtitle}
        </p>
        <div className="mt-space-xs flex items-baseline justify-between gap-space-xs">
          <span className="font-numeric-md text-numeric-md text-primary whitespace-nowrap">
            {formatMoney(product.unitPrice)} {isScale ? "/ lb" : "each"}
          </span>
          <span className="font-label-sm text-label-sm text-outline">
            Dept {product.departmentCode}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        className={`mt-space-sm w-full h-10 rounded font-label-md text-label-md flex items-center justify-center gap-space-xs transition-colors ${
          selected
            ? "bg-primary text-on-primary shadow-sm hover:bg-primary-container"
            : "bg-surface-container text-on-surface hover:bg-primary hover:text-on-primary"
        }`}
      >
        <Icon name={selected ? "add_shopping_cart" : "add"} className="text-sm" />
        <span>Select Item</span>
      </button>
    </div>
  );
}
