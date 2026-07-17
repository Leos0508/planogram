"use client";

import CatalogPageLayout from "@/components/catalog-page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import {
  SKU_IMAGE_MAX_BYTES,
  validateSkuImageFile,
} from "@/lib/blob/sku-image-shared";
import {
  createSku,
  deleteSku,
  updateSku,
  uploadSkuImage,
} from "@/lib/skus/actions";
import { filterSkusByQuery } from "@/lib/skus/filter";
import type { Sku } from "@/lib/skus/queries";
import { isValidSkuFootprint } from "@/lib/validation/sku";
import { WORKSPACE_READ_ONLY_HINT } from "@/lib/workspaces/capabilities";
import { PencilIcon, PlusIcon, SearchIcon, Trash2Icon, XIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

const SEARCH_DEBOUNCE_MS = 250;

type SkuFormState = {
  name: string;
  sku: string;
  width: string;
  height: string;
  imageUrl: string;
  imageFile: File | null;
  clearImage: boolean;
};

const emptyForm = (): SkuFormState => ({
  name: "",
  sku: "",
  width: "",
  height: "",
  imageUrl: "",
  imageFile: null,
  clearImage: false,
});

function replaceSearchParam(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  searchParams: URLSearchParams,
  query: string | null,
) {
  const params = new URLSearchParams(searchParams.toString());
  const trimmed = query?.trim() ?? "";
  if (trimmed) {
    params.set("q", trimmed);
  } else {
    params.delete("q");
  }
  const queryString = params.toString();
  router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
    scroll: false,
  });
}

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
  const [fileError, setFileError] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const replaceLocalPreview = (file: File | null) => {
    setLocalPreview(file ? URL.createObjectURL(file) : null);
  };

  const previewSrc =
    localPreview ??
    (!values.clearImage && values.imageUrl ? values.imageUrl : null);

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
          <Label htmlFor="sku-image-file">Image (optional)</Label>
          <Input
            id="sku-image-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={pending}
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              if (!file) {
                setFileError(null);
                replaceLocalPreview(null);
                setValues((prev) => ({ ...prev, imageFile: null }));
                return;
              }
              const error = validateSkuImageFile(file);
              if (error) {
                setFileError(error);
                event.target.value = "";
                replaceLocalPreview(null);
                setValues((prev) => ({ ...prev, imageFile: null }));
                return;
              }
              setFileError(null);
              replaceLocalPreview(file);
              setValues((prev) => ({
                ...prev,
                imageFile: file,
                clearImage: false,
              }));
            }}
          />
          <p className="text-xs text-muted-foreground">
            JPEG, PNG, or WebP · max {SKU_IMAGE_MAX_BYTES / (1024 * 1024)} MB
          </p>
          {fileError ? (
            <p className="text-sm text-destructive" role="alert">
              {fileError}
            </p>
          ) : null}
          {previewSrc ? (
            <div className="mt-1 flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewSrc}
                alt="SKU preview"
                className="size-16 border object-contain bg-muted/30"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => {
                  setFileError(null);
                  replaceLocalPreview(null);
                  setValues((prev) => ({
                    ...prev,
                    imageFile: null,
                    imageUrl: "",
                    clearImage: true,
                  }));
                }}
              >
                Remove image
              </Button>
            </div>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="sku-image-url">Or paste image URL</Label>
          <Input
            id="sku-image-url"
            type="url"
            placeholder="https://…"
            value={values.clearImage ? "" : values.imageUrl}
            disabled={pending || Boolean(values.imageFile)}
            onChange={(event) => {
              replaceLocalPreview(null);
              setValues((prev) => ({
                ...prev,
                imageUrl: event.target.value,
                clearImage: false,
                imageFile: null,
              }));
            }}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending || Boolean(fileError)}>
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
      imageUrl: values.clearImage
        ? null
        : values.imageUrl.trim() || null,
      imageFile: values.imageFile,
      clearImage: values.clearImage,
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"none" | "create" | "edit">("none");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(urlQuery);
  const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery);

  if (urlQuery !== prevUrlQuery) {
    setPrevUrlQuery(urlQuery);
    setSearchInput(urlQuery);
  }

  const { schedule: scheduleQueryUpdate } = useDebouncedCallback(
    (nextQuery: string) => {
      replaceSearchParam(router, pathname, searchParams, nextQuery);
    },
    SEARCH_DEBOUNCE_MS,
  );

  const filteredSkus = filterSkusByQuery(skus, urlQuery);
  const hasActiveSearch = urlQuery.trim().length > 0;
  const editingSku = skus.find((sku) => sku.id === editingId);

  const clearSearch = () => {
    setSearchInput("");
    replaceSearchParam(router, pathname, searchParams, "");
  };

  const closeForm = () => {
    setMode("none");
    setEditingId(null);
    setError(null);
  };

  const resolveImageUrl = async (
    parsed: ReturnType<typeof parseForm> & { ok: true },
  ): Promise<{ ok: true; imageUrl: string | null } | { ok: false; message: string }> => {
    if (parsed.data.imageFile) {
      const formData = new FormData();
      formData.set("file", parsed.data.imageFile);
      const upload = await uploadSkuImage(formData);
      if (!upload.ok) return { ok: false, message: upload.message };
      return { ok: true, imageUrl: upload.data.url };
    }
    return { ok: true, imageUrl: parsed.data.imageUrl };
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
      const image = await resolveImageUrl(parsed);
      if (!image.ok) {
        setError(image.message);
        return;
      }

      const result = await createSku({
        name: parsed.data.name,
        sku: parsed.data.sku,
        width: parsed.data.width,
        height: parsed.data.height,
        imageUrl: image.imageUrl,
      });
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
      const image = await resolveImageUrl(parsed);
      if (!image.ok) {
        setError(image.message);
        return;
      }

      const result = await updateSku({
        id: editingId,
        name: parsed.data.name,
        sku: parsed.data.sku,
        width: parsed.data.width,
        height: parsed.data.height,
        imageUrl: image.imageUrl,
      });
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
    <CatalogPageLayout
      title="SKUs"
      action={
        canWrite ? (
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
        ) : null
      }
      banner={
        !canWrite ? (
          <p className="text-sm text-muted-foreground">{WORKSPACE_READ_ONLY_HINT}</p>
        ) : null
      }
      search={
        <div className="relative">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="sku-search"
            type="text"
            value={searchInput}
            onChange={(event) => {
              const value = event.target.value;
              setSearchInput(value);
              scheduleQueryUpdate(value);
            }}
            placeholder="Search by name or code"
            className="pr-9 pl-9"
            aria-label="Search SKUs by name or code"
            disabled={pending}
          />
          {searchInput ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute top-1/2 right-1 -translate-y-1/2"
              title="Clear search"
              onClick={clearSearch}
              disabled={pending}
            >
              <XIcon className="size-4" />
            </Button>
          ) : null}
        </div>
      }
      alert={
        error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null
      }
    >
      {canWrite && mode === "create" ? (
        <SkuForm
          key="create"
          initial={emptyForm()}
          submitLabel="Create SKU"
          onSubmit={handleCreate}
          onCancel={closeForm}
          pending={pending}
        />
      ) : null}

      {canWrite && mode === "edit" && editingSku ? (
        <SkuForm
          key={editingSku.id}
          initial={{
            name: editingSku.name,
            sku: editingSku.sku,
            width: String(editingSku.width),
            height: String(editingSku.height),
            imageUrl: editingSku.imageUrl ?? "",
            imageFile: null,
            clearImage: false,
          }}
          submitLabel="Save changes"
          onSubmit={handleUpdate}
          onCancel={closeForm}
          pending={pending}
        />
      ) : null}

      {skus.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {canWrite
            ? "No SKUs yet. Add products with width and height in millimeters."
            : "No SKUs in this workspace."}
        </p>
      ) : filteredSkus.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {hasActiveSearch
            ? `No SKUs match “${urlQuery.trim()}”. Try a different name or code, or clear the search.`
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
              {filteredSkus.map((sku) => (
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
    </CatalogPageLayout>
  );
}
