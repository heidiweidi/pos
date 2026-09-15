"use client";

import { Icon } from "@/components/ui/Icon";
import { formatWeight } from "@/lib/money";

interface TarePreset {
  id: string;
  label: string;
  lb: number;
}

/** In-counter scale terminal: hero net weight, tare presets, zero. */
export function ScaleDock({
  grossLb,
  tareLb,
  stable,
  active,
  presets,
  onTare,
  onZero,
  onManualWeight,
}: {
  grossLb: number;
  tareLb: number;
  stable: boolean;
  /** False when a by-count item is selected — the scale isn't in play. */
  active: boolean;
  presets: TarePreset[];
  onTare: (lb: number) => void;
  onZero: () => void;
  onManualWeight: (lb: number) => void;
}) {
  const net = Math.max(0, grossLb - tareLb);

  return (
    <div className="bg-inverse-surface text-inverse-on-surface p-space-md rounded shadow-md flex flex-col gap-space-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-space-xs">
          <Icon name="scale" className="text-primary-fixed-dim text-lg" />
          <span className="font-label-md text-label-md text-inverse-on-surface uppercase tracking-wider">
            Avery Berkel In-Counter
          </span>
        </div>
        <span
          className={`px-space-xs py-0.5 rounded font-label-sm text-label-sm font-bold ${
            stable ? "bg-primary text-on-primary" : "bg-tertiary-container text-on-tertiary-container"
          }`}
        >
          {stable ? "STABLE" : "IN MOTION"}
        </span>
      </div>

      <div className="bg-black/30 p-space-md rounded flex items-baseline justify-between gap-space-sm">
        <div className="min-w-0">
          <div className="font-label-sm text-label-sm text-outline-variant uppercase">Net Weight</div>
          {active ? (
            <div className="font-numeric-hero text-numeric-hero text-primary-fixed tracking-tight">
              {formatWeight(net)} <span className="text-headline-md font-normal">lb</span>
            </div>
          ) : (
            <div className="font-headline-sm text-headline-sm font-normal text-outline-variant py-space-sm">
              Scale inactive (count)
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="font-label-sm text-label-sm text-outline-variant">
            Gross: {formatWeight(grossLb)} lb
          </div>
          <div className="font-label-sm text-label-sm text-primary-fixed-dim">
            Tare: {tareLb > 0 ? `-${formatWeight(tareLb)}` : formatWeight(0)} lb
          </div>
        </div>
      </div>

      <div className="flex items-center gap-space-xs pt-space-xs">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onTare(preset.lb)}
            className={`flex-1 py-1.5 px-2 rounded font-label-sm text-label-sm text-center transition-colors text-inverse-on-surface ${
              Math.abs(tareLb - preset.lb) < 0.001
                ? "bg-surface-container/30"
                : "bg-surface-container/10 hover:bg-surface-container/20"
            }`}
          >
            {preset.label} (-{preset.lb.toFixed(2)})
          </button>
        ))}
        <button
          type="button"
          onClick={onZero}
          className="py-1.5 px-3 rounded bg-tertiary-container text-on-tertiary-container font-label-sm text-label-sm font-bold hover:brightness-110 transition-all"
        >
          ZERO
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          const input = window.prompt("Enter gross weight in lb:", formatWeight(grossLb));
          if (input === null) return;
          const lb = Number.parseFloat(input);
          if (Number.isFinite(lb) && lb >= 0) onManualWeight(lb);
        }}
        className="w-full py-1.5 rounded bg-surface-container/10 hover:bg-surface-container/20 text-inverse-on-surface font-label-sm text-label-sm transition-colors flex items-center justify-center gap-1"
      >
        <Icon name="edit" className="text-sm" /> Simulate weight on platter
      </button>
    </div>
  );
}
