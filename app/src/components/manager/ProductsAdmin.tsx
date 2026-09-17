"use client";

import { useEffect, useMemo, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import {
  createProduct,
  deleteProduct,
  listAllProducts,
  setProductActive,
  updateProduct,
  type ProductAdminRow,
  type ProductFormInput,
} from "@/lib/data/products-admin";
import { formatMoney, parseDollarsToCents } from "@/lib/money";
import { usePos } from "@/lib/store/pos-store";
import { useSession } from "@/lib/store/session-store";
import type { Department, PricingMode, TaxFlag } from "@/lib/types";

const DEPARTMENTS: Department[] = [
  "Produce",
  "Dairy",
  "Bakery",
  "Deli",
  "Seafood",
  "Meat",
  "Grocery",
  "Beverage",
  "Frozen",
  "Non-Food",
];

const EMPTY_FORM: ProductFormInput = {
  name: "",
  subtitle: "",
  department: "Grocery",
  departmentCode: "",
  pricingMode: "count",
  unitLabel: "each",
  unitPriceCents: 0,
  taxFlag: "F",
  ebtEligible: true,
  depositCents: 0,
  organic: false,
  plu: "",
  upc: "",
  sku: "",
  categories: [],
};

function rowToForm(row: ProductAdminRow): ProductFormInput {
  return {
    name: row.name,
    subtitle: row.subtitle ?? "",
    department: row.department as Department,
    departmentCode: row.department_code,
    pricingMode: row.pricing_mode as PricingMode,
    unitLabel: row.unit_label as "lb" | "each",
    unitPriceCents: row.unit_price_cents,
    taxFlag: row.tax_flag as TaxFlag,
    ebtEligible: row.ebt_eligible,
    depositCents: row.deposit_cents,
    organic: row.organic,
    plu: row.plu ?? "",
    upc: row.upc ?? "",
    sku: row.sku ?? "",
    categories: row.categories ?? [],
  };
}

function codeSummary(row: ProductAdminRow): string {
  const parts: string[] = [];
  if (row.plu) parts.push(`PLU ${row.plu}`);
  if (row.upc) parts.push(`UPC ${row.upc}`);
  if (row.sku) parts.push(`SKU ${row.sku}`);
  return parts.length > 0 ? parts.join(" • ") : "No code set";
}

export function ProductsAdmin() {
  const { cashier } = useSession();
  const { showToast } = usePos();

  const [products, setProducts] = useState<ProductAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormInput>(EMPTY_FORM);
  const [priceInput, setPriceInput] = useState("");
  const [depositInput, setDepositInput] = useState("");
  const [categoriesInput, setCategoriesInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const isManager = cashier?.role === "manager";

  // No setState before the first `await` here — this is invoked straight from
  // the effect below, and `loading`/`loadError` already start at their right
  // defaults, so nothing needs to run synchronously before the fetch settles.
  async function refresh() {
    try {
      const rows = await listAllProducts();
      setProducts(rows);
      setLoadError(null);
    } catch (error) {
      console.error("[ProductsAdmin] listAllProducts failed:", error);
      setLoadError("Couldn't load the catalog. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isManager) return;
    // A one-time catalog fetch on mount, same shape as any client-side data
    // load — the resulting setState calls run after the promise settles, not
    // synchronously in this callback. Suppressing the newer set-state-in-effect
    // rule here rather than pulling in a fetching library for one admin screen.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [isManager]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q) ||
        (p.plu ?? "").includes(q) ||
        (p.upc ?? "").includes(q) ||
        (p.sku ?? "").includes(q),
    );
  }, [products, query]);

  function startAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setPriceInput("");
    setDepositInput("");
    setCategoriesInput("");
    setFormOpen(true);
  }

  function startEdit(row: ProductAdminRow) {
    const next = rowToForm(row);
    setEditingId(row.id);
    setForm(next);
    setPriceInput((next.unitPriceCents / 100).toFixed(2));
    setDepositInput(next.depositCents > 0 ? (next.depositCents / 100).toFixed(2) : "");
    setCategoriesInput(next.categories.join(", "));
    setFormOpen(true);
  }

  function cancelForm() {
    setFormOpen(false);
    setEditingId(null);
  }

  async function submitForm(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) {
      showToast({ title: "Name is required", tone: "error" });
      return;
    }
    if (!form.departmentCode.trim()) {
      showToast({ title: "Department code is required", detail: "e.g. 04 for Produce", tone: "error" });
      return;
    }

    const input: ProductFormInput = {
      ...form,
      unitPriceCents: parseDollarsToCents(priceInput),
      depositCents: depositInput.trim() ? parseDollarsToCents(depositInput) : 0,
      categories: categoriesInput
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
    };

    setSaving(true);
    try {
      if (editingId) {
        const updated = await updateProduct(editingId, input);
        setProducts((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
        showToast({ title: `Updated ${updated.name}`, tone: "success" });
      } else {
        const created = await createProduct(input);
        setProducts((prev) => [...prev, created]);
        showToast({ title: `Added ${created.name}`, tone: "success" });
      }
      setFormOpen(false);
      setEditingId(null);
    } catch (error) {
      console.error("[ProductsAdmin] save failed:", error);
      const message = error instanceof Error ? error.message : "Please try again.";
      const friendly = message.includes("duplicate key")
        ? "That PLU, UPC, or SKU is already used by another product."
        : message;
      showToast({ title: "Couldn't save product", detail: friendly, tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(row: ProductAdminRow) {
    try {
      await setProductActive(row.id, !row.active);
      setProducts((prev) => prev.map((p) => (p.id === row.id ? { ...p, active: !p.active } : p)));
      showToast({
        title: row.active ? `${row.name} deactivated` : `${row.name} reactivated`,
        tone: row.active ? "warning" : "success",
      });
    } catch (error) {
      console.error("[ProductsAdmin] toggleActive failed:", error);
      showToast({ title: "Couldn't update product", tone: "error" });
    }
  }

  async function remove(row: ProductAdminRow) {
    if (!window.confirm(`Delete "${row.name}" permanently? This can't be undone.`)) return;
    try {
      await deleteProduct(row.id);
      setProducts((prev) => prev.filter((p) => p.id !== row.id));
      showToast({ title: `Deleted ${row.name}`, tone: "success" });
    } catch (error) {
      console.error("[ProductsAdmin] delete failed:", error);
      showToast({
        title: "Couldn't delete product",
        detail: "It may be referenced by past sales — try deactivating it instead.",
        tone: "error",
      });
    }
  }

  if (!isManager) {
    return (
      <div className="p-space-md max-w-xl mx-auto w-full">
        <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm text-center flex flex-col items-center gap-space-sm">
          <Icon name="lock" className="text-4xl text-outline" />
          <h1 className="font-headline-sm text-headline-sm text-on-surface">Manager access required</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Product management is limited to manager accounts. Ask a manager to sign in to make changes here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-space-md flex flex-col gap-space-md max-w-[1400px] mx-auto w-full">
      <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
        <div>
          <h1 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-space-xs">
            <Icon name="inventory_2" className="text-primary" />
            Manage Products
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            Changes here write straight to the live catalog. New items are searchable by PLU, UPC or SKU
            right away.
          </p>
        </div>
        <button
          type="button"
          onClick={startAdd}
          className="h-11 px-space-md rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md flex items-center gap-space-xs shadow-sm transition-all active:translate-y-0.5 shrink-0"
        >
          <Icon name="add" className="text-lg" />
          Add Product
        </button>
      </div>

      {formOpen ? (
        <ProductForm
          form={form}
          setForm={setForm}
          priceInput={priceInput}
          setPriceInput={setPriceInput}
          depositInput={depositInput}
          setDepositInput={setDepositInput}
          categoriesInput={categoriesInput}
          setCategoriesInput={setCategoriesInput}
          saving={saving}
          isEditing={Boolean(editingId)}
          onSubmit={submitForm}
          onCancel={cancelForm}
        />
      ) : null}

      <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
        <div className="flex items-center gap-space-sm mb-space-sm">
          <div className="relative flex-1 max-w-sm">
            <Icon
              name="search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg pointer-events-none"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, department, PLU, UPC, SKU"
              className="w-full h-10 pl-10 pr-3 bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>
          <span className="font-label-sm text-label-sm text-on-surface-variant whitespace-nowrap">
            {filtered.length} of {products.length} products
          </span>
        </div>

        {loading ? (
          <div className="py-space-xl text-center font-body-md text-body-md text-on-surface-variant">
            Loading catalog…
          </div>
        ) : loadError ? (
          <div className="py-space-xl text-center font-body-md text-body-md text-error">{loadError}</div>
        ) : filtered.length === 0 ? (
          <div className="py-space-xl text-center font-body-md text-body-md text-on-surface-variant">
            No products match “{query}”.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider border-b border-surface-container-high">
                  <th className="py-space-xs pr-space-sm">Product</th>
                  <th className="py-space-xs pr-space-sm">Department</th>
                  <th className="py-space-xs pr-space-sm">Price</th>
                  <th className="py-space-xs pr-space-sm">Codes</th>
                  <th className="py-space-xs pr-space-sm">Tax</th>
                  <th className="py-space-xs pr-space-sm">EBT</th>
                  <th className="py-space-xs pr-space-sm">Status</th>
                  <th className="py-space-xs pr-space-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className={`border-b border-surface-container-low ${row.active ? "" : "opacity-50"}`}
                  >
                    <td className="py-space-sm pr-space-sm">
                      <div className="font-label-md text-label-md text-on-surface">{row.name}</div>
                      {row.subtitle ? (
                        <div className="font-body-sm text-body-sm text-on-surface-variant">
                          {row.subtitle}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-space-sm pr-space-sm font-body-sm text-body-sm text-on-surface-variant">
                      {row.department}
                    </td>
                    <td className="py-space-sm pr-space-sm font-numeric-md text-numeric-md text-on-surface">
                      {formatMoney(row.unit_price_cents)}
                      <span className="font-body-sm text-body-sm text-outline">
                        {" "}
                        /{row.unit_label}
                      </span>
                    </td>
                    <td className="py-space-sm pr-space-sm font-body-sm text-body-sm text-on-surface-variant">
                      {codeSummary(row)}
                    </td>
                    <td className="py-space-sm pr-space-sm font-label-sm text-label-sm">{row.tax_flag}</td>
                    <td className="py-space-sm pr-space-sm">
                      <Icon
                        name={row.ebt_eligible ? "check_circle" : "cancel"}
                        className={`text-base ${row.ebt_eligible ? "text-primary" : "text-outline"}`}
                      />
                    </td>
                    <td className="py-space-sm pr-space-sm">
                      <span
                        className={`font-label-sm text-label-sm px-space-xs py-0.5 rounded ${
                          row.active
                            ? "bg-primary-container text-on-primary-container"
                            : "bg-surface-container text-on-surface-variant"
                        }`}
                      >
                        {row.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-space-sm text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        title="Edit"
                        aria-label={`Edit ${row.name}`}
                        className="w-8 h-8 inline-flex items-center justify-center rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors"
                      >
                        <Icon name="edit" className="text-lg" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleActive(row)}
                        title={row.active ? "Deactivate" : "Reactivate"}
                        aria-label={row.active ? `Deactivate ${row.name}` : `Reactivate ${row.name}`}
                        className="w-8 h-8 inline-flex items-center justify-center rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors"
                      >
                        <Icon name={row.active ? "visibility_off" : "visibility"} className="text-lg" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(row)}
                        title="Delete"
                        aria-label={`Delete ${row.name}`}
                        className="w-8 h-8 inline-flex items-center justify-center rounded hover:bg-error-container text-on-surface-variant hover:text-on-error-container transition-colors"
                      >
                        <Icon name="delete" className="text-lg" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductForm({
  form,
  setForm,
  priceInput,
  setPriceInput,
  depositInput,
  setDepositInput,
  categoriesInput,
  setCategoriesInput,
  saving,
  isEditing,
  onSubmit,
  onCancel,
}: {
  form: ProductFormInput;
  setForm: React.Dispatch<React.SetStateAction<ProductFormInput>>;
  priceInput: string;
  setPriceInput: (v: string) => void;
  depositInput: string;
  setDepositInput: (v: string) => void;
  categoriesInput: string;
  setCategoriesInput: (v: string) => void;
  saving: boolean;
  isEditing: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-sm"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-label-lg text-label-lg text-on-surface">
          {isEditing ? "Edit Product" : "New Product"}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="w-8 h-8 inline-flex items-center justify-center rounded hover:bg-surface-container-high text-on-surface-variant"
        >
          <Icon name="close" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-sm">
        <Field label="Name *">
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={inputClass}
            placeholder="Sourdough Artisan Boule"
          />
        </Field>

        <Field label="Subtitle">
          <input
            value={form.subtitle}
            onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
            className={inputClass}
            placeholder="Bakery Scratch"
          />
        </Field>

        <Field label="Department *">
          <select
            value={form.department}
            onChange={(e) => setForm((f) => ({ ...f, department: e.target.value as typeof f.department }))}
            className={inputClass}
          >
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Department code *" hint="Printed on the receipt, e.g. 04">
          <input
            required
            value={form.departmentCode}
            onChange={(e) => setForm((f) => ({ ...f, departmentCode: e.target.value }))}
            className={inputClass}
            placeholder="04"
          />
        </Field>

        <Field label="Pricing mode *">
          <select
            value={form.pricingMode}
            onChange={(e) => {
              const pricingMode = e.target.value as typeof form.pricingMode;
              setForm((f) => ({
                ...f,
                pricingMode,
                unitLabel: pricingMode === "scale" ? "lb" : "each",
              }));
            }}
            className={inputClass}
          >
            <option value="count">Count (by item)</option>
            <option value="scale">Scale (by weight)</option>
          </select>
        </Field>

        <Field label="Unit price *" hint={form.pricingMode === "scale" ? "Per pound" : "Per item"}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline">$</span>
            <input
              required
              inputMode="decimal"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              className={`${inputClass} pl-6`}
              placeholder="0.00"
            />
          </div>
        </Field>

        <Field label="Tax flag *">
          <select
            value={form.taxFlag}
            onChange={(e) => setForm((f) => ({ ...f, taxFlag: e.target.value as typeof f.taxFlag }))}
            className={inputClass}
          >
            <option value="F">F — Food (tax-exempt)</option>
            <option value="T">T — Taxable merchandise</option>
          </select>
        </Field>

        <Field label="Container deposit" hint="e.g. CRV, leave blank if none">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline">$</span>
            <input
              inputMode="decimal"
              value={depositInput}
              onChange={(e) => setDepositInput(e.target.value)}
              className={`${inputClass} pl-6`}
              placeholder="0.00"
            />
          </div>
        </Field>

        <Field label="Categories" hint="Comma-separated, optional">
          <input
            value={categoriesInput}
            onChange={(e) => setCategoriesInput(e.target.value)}
            className={inputClass}
            placeholder="organic, greens"
          />
        </Field>

        <Field label="PLU" hint="4–5 digit produce code">
          <input
            value={form.plu}
            onChange={(e) => setForm((f) => ({ ...f, plu: e.target.value }))}
            className={inputClass}
            placeholder="4132"
          />
        </Field>

        <Field label="UPC" hint="Scanned barcode">
          <input
            value={form.upc}
            onChange={(e) => setForm((f) => ({ ...f, upc: e.target.value }))}
            className={inputClass}
            placeholder="04122081921"
          />
        </Field>

        <Field label="SKU" hint="Internal code">
          <input
            value={form.sku}
            onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
            className={inputClass}
            placeholder="109"
          />
        </Field>
      </div>

      <div className="flex items-center gap-space-lg mt-space-xs">
        <label className="flex items-center gap-space-xs font-body-md text-body-md text-on-surface">
          <input
            type="checkbox"
            checked={form.ebtEligible}
            onChange={(e) => setForm((f) => ({ ...f, ebtEligible: e.target.checked }))}
            className="w-4 h-4"
          />
          SNAP/EBT eligible
        </label>
        <label className="flex items-center gap-space-xs font-body-md text-body-md text-on-surface">
          <input
            type="checkbox"
            checked={form.organic}
            onChange={(e) => setForm((f) => ({ ...f, organic: e.target.checked }))}
            className="w-4 h-4"
          />
          Organic
        </label>
      </div>

      <div className="flex items-center justify-end gap-space-sm mt-space-sm">
        <button
          type="button"
          onClick={onCancel}
          className="h-11 px-space-md rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="h-11 px-space-lg rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md shadow-sm transition-all active:translate-y-0.5 disabled:opacity-60"
        >
          {saving ? "Saving…" : isEditing ? "Save changes" : "Add product"}
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "w-full h-11 px-3 bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="font-label-md text-label-md text-on-surface block mb-1">{label}</label>
      {children}
      {hint ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{hint}</p>
      ) : null}
    </div>
  );
}
