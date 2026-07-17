"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSku, deleteSku, updateSku } from "@/lib/skus/actions";
import type { Sku } from "@/lib/skus/queries";
import { isValidSkuFootprint } from "@/lib/validation/sku";
import { WORKSPACE_READ_ONLY_HINT } from "@/lib/workspaces/capabilities";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type SkuFormState = {
  name: string;
  sku: string;
  width: string;
  height: string;
  imageUrl: string;
};

const emptyForm = (): SkuFormState => ({
  name: "",
  sku: "",
  width: "",
  height: "",
  imageUrl: "",
});

function SkuForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  pending,
}: {
  initial: SkuFormState;
  submitLabel: string;
  onSubmit: (values: SkuFormState) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [values, setValues] = useState(initial);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
      className="flex flex-col gap-3 border bg-card p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="sku-name">Name</Label>
          <Input
            id="sku-name"
            value={values.name}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, name: event.target.value }))
            }
            required
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="sku-code">SKU code</Label>
          <Input
            id="sku-code"
            value={values.sku}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, sku: event.target.value }))
            }
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sku-width">Width (mm)</Label>
          <Input
            id="sku-width"
            type="number"
            min={1}
            value={values.width}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, width: event.target.value }))
            }
            className="font-mono"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sku-height">Height (mm)</Label>
          <Input
            id="sku-height"
            type="number"
            min={1}
            value={values.height}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, height: event.target.value }))
            }
            className="font-mono"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="sku-image-url">Image URL (optional)</Label>
          <Input
            id="sku-image-url"
            type="url"
            placeholder="https://…"
            value={values.imageUrl}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, imageUrl: event.target.value }))
            }
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {submitLabel}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function parseForm(values: SkuFormState) {
  const width = Number.parseInt(values.width, 10);
  const height = Number.parseInt(values.height, 10);
  if (!isValidSkuFootprint(width, height)) {
    return { ok: false as const, message: "Width and height must be positive mm" };
  }
  return {
    ok: true as const,
    data: {
      name: values.name.trim(),
      sku: values.sku.trim(),
      width,
      height,
      imageUrl: values.imageUrl.trim() || null,
    },
  };
}

export default function SkuManager({
  skus,
  canWrite,
}: {
  skus: Sku[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"none" | "create" | "edit">("none");
  const [editingId, setEditingId] = useState<string | null>(null);

  const editingSku = skus.find((sku) => sku.id === editingId);

  const closeForm = () => {
    setMode("none");
    setEditingId(null);
    setError(null);
  };

  const handleCreate = (values: SkuFormState) => {
    if (!canWrite) return;
    const parsed = parseForm(values);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await createSku(parsed.data);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      closeForm();
      router.refresh();
    });
  };

  const handleUpdate = (values: SkuFormState) => {
    if (!editingId || !canWrite) return;

    const parsed = parseForm(values);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await updateSku({ id: editingId, ...parsed.data });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      closeForm();
      router.refresh();
    });
  };

  const handleDelete = (sku: Sku) => {
    if (!canWrite) return;
    if (!window.confirm(`Delete "${sku.name}"?`)) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteSku({ id: sku.id });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      if (editingId === sku.id) closeForm();
      router.refresh();
    });
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-heading text-base font-semibold uppercase tracking-wider">
          SKUs
        </h1>
        {canWrite ? (
          <Button
            type="button"
            variant={mode === "create" ? "secondary" : "default"}
            size="sm"
            onClick={() => {
              setMode("create");
              setEditingId(null);
              setError(null);
            }}
          >
            <PlusIcon className="size-4" />
            New
          </Button>
        ) : null}
      </div>

      {!canWrite ? (
        <p className="text-sm text-muted-foreground">{WORKSPACE_READ_ONLY_HINT}</p>
      ) : null}

      {canWrite && mode === "create" ? (
        <SkuForm
          initial={emptyForm()}
          submitLabel="Create SKU"
          onSubmit={handleCreate}
          onCancel={closeForm}
          pending={pending}
        />
      ) : null}

      {canWrite && mode === "edit" && editingSku ? (
        <SkuForm
          initial={{
            name: editingSku.name,
            sku: editingSku.sku,
            width: String(editingSku.width),
            height: String(editingSku.height),
            imageUrl: editingSku.imageUrl ?? "",
          }}
          submitLabel="Save changes"
          onSubmit={handleUpdate}
          onCancel={closeForm}
          pending={pending}
        />
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {skus.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {canWrite
            ? "No SKUs yet. Add products with width and height in millimeters."
            : "No SKUs in this workspace."}
        </p>
      ) : (
        <div className="overflow-x-auto border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-semibold">Name</th>
                <th className="px-4 py-2 font-semibold">Code</th>
                <th className="px-4 py-2 font-semibold">Footprint (mm)</th>
                {canWrite ? (
                  <th className="px-4 py-2 font-semibold">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {skus.map((sku) => (
                <tr key={sku.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3">{sku.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{sku.sku}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {sku.width} × {sku.height}
                  </td>
                  {canWrite ? (
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          title={`Edit ${sku.name}`}
                          disabled={pending}
                          onClick={() => {
                            setMode("edit");
                            setEditingId(sku.id);
                            setError(null);
                          }}
                        >
                          <PencilIcon className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          title={`Delete ${sku.name}`}
                          disabled={pending}
                          onClick={() => handleDelete(sku)}
                        >
                          <Trash2Icon className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
