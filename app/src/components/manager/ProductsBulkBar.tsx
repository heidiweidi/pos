"use client";

import { useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { normaliseCategory, type BulkPatch, type CategoryEdit } from "@/lib/data/products-admin";
import type { Department } from "@/lib/types";

const MODES: { id: CategoryEdit["mode"]; label: string }[] = [
  { id: "add", label: "Add to" },
  { id: "remove", label: "Remove from" },
  { id: "replace", label: "Replace with" },
];

/**
 * Sticky action bar for the products table. Department comes first because it
 * is the common bulk change; categories can be picked from those already in use
 * or created on the spot.
 */
export function ProductsBulkBar({
  count,
  departments,
  departmentCodes,
  existingCategories,
  busy,
  onApply,
  onClear,
}: {
  count: number;
  departments: Department[];
  /** Known department → code, so a department change can carry its code along. */
  departmentCodes: Record<string, string>;
  existingCategories: string[];
  busy: boolean;
  onApply: (patch: BulkPatch) => void;
  onClear: () => void;
}) {
  const [department, setDepartment] = useState<Department | "">("");
  const [departmentCode, setDepartmentCode] = useState("");
  const [mode, setMode] = useState<CategoryEdit["mode"]>("add");
  const [picked, setPicked] = useState<string[]>([]);
  const [created, setCreated] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [status, setStatus] = useState<"" | "active" | "inactive">("");

  const options = [...new Set([...existingCategories, ...created])].sort();
  const hasChange = department !== "" || picked.length > 0 || status !== "";

  function toggle(category: string) {
    setPicked((prev) => (prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]));
  }

  function addNew() {
    const category = normaliseCategory(newCategory);
    if (!category) return;
    if (!options.includes(category)) setCreated((prev) => [...prev, category]);
    setPicked((prev) => (prev.includes(category) ? prev : [...prev, category]));
    setNewCategory("");
  }

  function pickDepartment(value: Department | "") {
    setDepartment(value);
    setDepartmentCode(value ? (departmentCodes[value] ?? "") : "");
  }

  function apply() {
    onApply({
      department: department || undefined,
      departmentCode: department ? departmentCode : undefined,
      categories: picked.length > 0 ? { mode, values: picked } : undefined,
      active: status === "" ? undefined : status === "active",
    });
  }

  const select =
    "h-10 px-2 bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="sticky top-16 z-30 bg-surface-container-lowest border-2 border-primary rounded-xl p-space-md shadow-md flex flex-col gap-space-sm">
      <div className="flex items-center justify-between gap-space-sm">
        <span className="font-label-lg text-label-lg text-on-surface flex items-center gap-space-xs">
          <Icon name="edit_note" className="text-primary" />
          Bulk edit — {count} selected
        </span>
        <button
          type="button"
          onClick={onClear}
          className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface"
        >
          Clear selection
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm">
        {/* Department */}
        <label className="flex flex-col gap-1">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
            Move to department
          </span>
          <select value={department} onChange={(e) => pickDepartment(e.target.value as Department | "")} className={select}>
            <option value="">— no change —</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          {department ? (
            <input
              value={departmentCode}
              onChange={(e) => setDepartmentCode(e.target.value)}
              placeholder="Dept code (leave blank to keep each item's)"
              aria-label="Department code"
              className={select}
            />
          ) : null}
        </label>

        {/* Status */}
        <label className="flex flex-col gap-1">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={select}>
            <option value="">— no change —</option>
            <option value="active">Set active</option>
            <option value="inactive">Set inactive</option>
          </select>
        </label>

        {/* Category mode */}
        <label className="flex flex-col gap-1">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Categories</span>
          <select value={mode} onChange={(e) => setMode(e.target.value as CategoryEdit["mode"])} className={select}>
            {MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} selected categories
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Category chips: existing first, then anything created here */}
      <div className="flex flex-wrap items-center gap-space-xs">
        {options.length === 0 ? (
          <span className="font-body-sm text-body-sm text-on-surface-variant">No categories yet — add one below.</span>
        ) : null}
        {options.map((category) => {
          const on = picked.includes(category);
          return (
            <button
              key={category}
              type="button"
              onClick={() => toggle(category)}
              aria-pressed={on}
              className={`px-space-sm py-1 rounded-full font-label-sm text-label-sm transition-colors ${
                on ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface hover:bg-surface-container-high"
              }`}
            >
              {on ? "✓ " : ""}
              {category}
              {created.includes(category) ? " (new)" : ""}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-space-xs">
        <input
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addNew();
            }
          }}
          placeholder="New category name"
          aria-label="New category name"
          className={`${select} w-56`}
        />
        <button
          type="button"
          onClick={addNew}
          disabled={!normaliseCategory(newCategory)}
          className="h-10 px-space-sm rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md disabled:opacity-50 flex items-center gap-1"
        >
          <Icon name="add" className="text-base" /> Add category
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={apply}
          disabled={!hasChange || busy}
          className="h-10 px-space-lg rounded-lg bg-primary text-on-primary font-label-lg text-label-lg disabled:opacity-50"
        >
          {busy ? "Applying…" : `Apply to ${count} product${count === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
  );
}
