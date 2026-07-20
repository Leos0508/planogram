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
  importSkus,
  updateSku,
  uploadSkuImage,
} from "@/lib/skus/actions";
import type { SkuImportSummary } from "@/lib/skus/actions";
import { detectSkuImportFormat } from "@/lib/skus/import-parse";
import { filterSkusByQuery } from "@/lib/skus/filter";
import {
  type SkuShape,
  deriveFaceOnMm,
  isSkuShape,
  parseSkuPackaging,
  readStoredPackaging,
} from "@/lib/skus/packaging";
import type { Sku } from "@/lib/skus/queries";
import {
  isValidSkuFootprint,
  normalizeSkuColor,
  randomSkuColor,
} from "@/lib/validation/sku";
import { WORKSPACE_READ_ONLY_HINT } from "@/lib/workspaces/capabilities";
import {
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

const SEARCH_DEBOUNCE_MS = 250;

type ShapeMode = "NONE" | SkuShape;

type SkuFormState = {
  name: string;
  sku: string;
  width: string;
  height: string;
  color: string;
  imageUrl: string;
  imageFile: File | null;
  clearImage: boolean;
  shape: ShapeMode;
  bodyDiameterMm: string;
  heightMm: string;
  endDiameterMm: string;
  baseDiameterMm: string;
  neckDiameterMm: string;
  capacityMl: string;
};

const emptyForm = (): SkuFormState => ({
  name: "",
  sku: "",
  width: "",
  height: "",
  color: randomSkuColor(),
  imageUrl: "",
  imageFile: null,
  clearImage: false,
  shape: "NONE",
  bodyDiameterMm: "",
  heightMm: "",
  endDiameterMm: "",
  baseDiameterMm: "",
  neckDiameterMm: "",
  capacityMl: "",
});

function formFromSku(sku: Sku): SkuFormState {
  const packaging = readStoredPackaging(sku.shape, sku.packaging);
  return {
    name: sku.name,
    sku: sku.sku,
    width: String(sku.width),
    height: String(sku.height),
    color: sku.color,
    imageUrl: sku.imageUrl ?? "",
    imageFile: null,
    clearImage: false,
    shape: packaging?.shape ?? "NONE",
    bodyDiameterMm:
      packaging != null ? String(packaging.bodyDiameterMm) : "",
    heightMm: packaging != null ? String(packaging.heightMm) : "",
    endDiameterMm:
      packaging?.shape === "CAN" ? String(packaging.endDiameterMm) : "",
    baseDiameterMm:
      packaging != null ? String(packaging.baseDiameterMm) : "",
    neckDiameterMm:
      packaging?.shape === "BOTTLE" ? String(packaging.neckDiameterMm) : "",
    capacityMl:
      packaging?.capacityMl != null ? String(packaging.capacityMl) : "",
  };
}

function packagingInputFromForm(values: SkuFormState) {
  const base = {
    bodyDiameterMm: values.bodyDiameterMm,
    heightMm: values.heightMm,
    baseDiameterMm: values.baseDiameterMm,
    capacityMl: values.capacityMl.trim() ? values.capacityMl : undefined,
  };
  if (values.shape === "CAN") {
    return { ...base, endDiameterMm: values.endDiameterMm };
  }
  if (values.shape === "BOTTLE") {
    return { ...base, neckDiameterMm: values.neckDiameterMm };
  }
  return null;
}

function derivedFacePreview(values: SkuFormState): {
  width: string;
  height: string;
} | null {
  if (values.shape === "NONE") return null;
  const packaging = packagingInputFromForm(values);
  if (!packaging) return null;
  const parsed = parseSkuPackaging(values.shape, packaging);
  if (!parsed.ok) return null;
  const face = deriveFaceOnMm(parsed.data);
  return { width: String(face.width), height: String(face.height) };
}

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

  const facePreview = derivedFacePreview(values);
  const isParametric = values.shape !== "NONE";

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
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="sku-shape">Packaging shape</Label>
          <select
            id="sku-shape"
            className="h-9 border border-border bg-background px-2 text-sm"
            value={values.shape}
            disabled={pending}
            onChange={(event) => {
              const next = event.target.value as ShapeMode;
              setValues((prev) => ({
                ...prev,
                shape: next,
                ...(next === "NONE"
                  ? {
                      bodyDiameterMm: "",
                      heightMm: "",
                      endDiameterMm: "",
                      baseDiameterMm: "",
                      neckDiameterMm: "",
                      capacityMl: "",
                    }
                  : {}),
              }));
            }}
          >
            <option value="NONE">Flat (width × height)</option>
            <option value="CAN">Can</option>
            <option value="BOTTLE">Bottle</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Can/bottle store parametric dims; face-on footprint is derived for
            the 2D editor.
          </p>
        </div>

        {isParametric ? (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sku-body-diameter">Body diameter (mm)</Label>
              <Input
                id="sku-body-diameter"
                type="number"
                min={1}
                step="any"
                value={values.bodyDiameterMm}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    bodyDiameterMm: event.target.value,
                  }))
                }
                className="font-mono"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sku-pack-height">Height (mm)</Label>
              <Input
                id="sku-pack-height"
                type="number"
                min={1}
                step="any"
                value={values.heightMm}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    heightMm: event.target.value,
                  }))
                }
                className="font-mono"
                required
              />
            </div>
            {values.shape === "CAN" ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sku-end-diameter">End/lid diameter (mm)</Label>
                <Input
                  id="sku-end-diameter"
                  type="number"
                  min={1}
                  step="any"
                  value={values.endDiameterMm}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      endDiameterMm: event.target.value,
                    }))
                  }
                  className="font-mono"
                  required
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sku-neck-diameter">Neck diameter (mm)</Label>
                <Input
                  id="sku-neck-diameter"
                  type="number"
                  min={1}
                  step="any"
                  value={values.neckDiameterMm}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      neckDiameterMm: event.target.value,
                    }))
                  }
                  className="font-mono"
                  required
                />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sku-base-diameter">Base diameter (mm)</Label>
              <Input
                id="sku-base-diameter"
                type="number"
                min={1}
                step="any"
                value={values.baseDiameterMm}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    baseDiameterMm: event.target.value,
                  }))
                }
                className="font-mono"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="sku-capacity">Capacity (ml, optional)</Label>
              <Input
                id="sku-capacity"
                type="number"
                min={1}
                step="any"
                value={values.capacityMl}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    capacityMl: event.target.value,
                  }))
                }
                className="font-mono"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sku-width">Face-on width (mm)</Label>
              <Input
                id="sku-width"
                type="number"
                value={facePreview?.width ?? ""}
                className="font-mono"
                readOnly
                disabled
                aria-describedby="sku-face-hint"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sku-height">Face-on height (mm)</Label>
              <Input
                id="sku-height"
                type="number"
                value={facePreview?.height ?? ""}
                className="font-mono"
                readOnly
                disabled
                aria-describedby="sku-face-hint"
              />
            </div>
            <p
              id="sku-face-hint"
              className="text-xs text-muted-foreground sm:col-span-2"
            >
              Derived from body diameter × height (rounded to whole mm).
            </p>
          </>
        ) : (
          <>
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
          </>
        )}
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="sku-color">Display color</Label>
          <div className="flex items-center gap-3">
            <Input
              id="sku-color"
              type="color"
              value={values.color}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, color: event.target.value }))
              }
              className="h-9 w-14 cursor-pointer p-1"
              required
            />
            <Input
              id="sku-color-hex"
              type="text"
              value={values.color}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, color: event.target.value }))
              }
              className="font-mono uppercase"
              pattern="^#?[0-9A-Fa-f]{6}$"
              maxLength={7}
              aria-label="Display color hex"
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Used on canvas, tray, and exports when no image is set.
          </p>
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
  const color = normalizeSkuColor(values.color);
  if (!color) {
    return { ok: false as const, message: "Color must be a valid hex value (#rrggbb)" };
  }

  const imageFields = {
    imageUrl: values.clearImage ? null : values.imageUrl.trim() || null,
    imageFile: values.imageFile,
    clearImage: values.clearImage,
  };

  if (values.shape === "NONE") {
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
        color,
        shape: null as SkuShape | null,
        packaging: null as unknown,
        ...imageFields,
      },
    };
  }

  if (!isSkuShape(values.shape)) {
    return { ok: false as const, message: "Shape must be CAN or BOTTLE" };
  }

  const packaging = packagingInputFromForm(values);
  const parsed = parseSkuPackaging(values.shape, packaging);
  if (!parsed.ok) {
    return { ok: false as const, message: parsed.message };
  }

  return {
    ok: true as const,
    data: {
      name: values.name.trim(),
      sku: values.sku.trim(),
      width: parsed.face.width,
      height: parsed.face.height,
      color,
      shape: parsed.data.shape,
      packaging: packagingInputFromForm(values),
      ...imageFields,
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
  const [importSummary, setImportSummary] = useState<SkuImportSummary | null>(
    null,
  );
  const [mode, setMode] = useState<"none" | "create" | "edit" | "import">(
    "none",
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importFileKey, setImportFileKey] = useState(0);
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
    setImportFile(null);
    setImportFileKey((key) => key + 1);
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
    setImportSummary(null);
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
        color: parsed.data.color,
        imageUrl: image.imageUrl,
        shape: parsed.data.shape,
        packaging: parsed.data.packaging,
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
    setImportSummary(null);
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
        color: parsed.data.color,
        imageUrl: image.imageUrl,
        shape: parsed.data.shape,
        packaging: parsed.data.packaging,
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
    setImportSummary(null);
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

  const handleImport = () => {
    if (!canWrite || !importFile) return;

    const format = detectSkuImportFormat(importFile.name, importFile.type);
    if (!format) {
      setError("Choose a .csv or .json file");
      return;
    }

    setError(null);
    setImportSummary(null);
    startTransition(async () => {
      const content = await importFile.text();
      const result = await importSkus({ content, format });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setImportSummary(result.data);
      setImportFile(null);
      setImportFileKey((key) => key + 1);
      if (result.data.created > 0) {
        router.refresh();
      }
    });
  };

  return (
    <CatalogPageLayout
      title="SKUs"
      action={
        canWrite ? (
          <>
            <Button
              type="button"
              variant={mode === "import" ? "secondary" : "outline"}
              size="sm"
              onClick={() => {
                setMode("import");
                setEditingId(null);
                setError(null);
                setImportSummary(null);
              }}
            >
              <UploadIcon className="size-4" />
              Import
            </Button>
            <Button
              type="button"
              variant={mode === "create" ? "secondary" : "default"}
              size="sm"
              onClick={() => {
                setMode("create");
                setEditingId(null);
                setError(null);
                setImportSummary(null);
              }}
            >
              <PlusIcon className="size-4" />
              New
            </Button>
          </>
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
        error || importSummary ? (
          <div className="flex flex-col gap-2">
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            {importSummary ? (
              <div className="border bg-card p-3 text-sm" role="status">
                <p>
                  Import finished: {importSummary.created} created
                  {importSummary.failed > 0
                    ? `, ${importSummary.failed} failed`
                    : ""}
                  .
                </p>
                {importSummary.errors.length > 0 ? (
                  <ul className="mt-2 max-h-40 list-disc overflow-y-auto pl-5 text-destructive">
                    {importSummary.errors.map((item) => (
                      <li key={`${item.row}-${item.message}`}>
                        Row {item.row}: {item.message}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null
      }
    >
      {canWrite && mode === "import" ? (
        <div className="flex flex-col gap-3 border bg-card p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sku-import-file">CSV or JSON file</Label>
            <Input
              key={importFileKey}
              id="sku-import-file"
              type="file"
              accept=".csv,.json,text/csv,application/json"
              disabled={pending}
              onChange={(event) => {
                setImportFile(event.target.files?.[0] ?? null);
                setError(null);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Required columns: name, sku, width, height (mm). Optional: color
              (#rrggbb), imageUrl (http/https). Duplicate codes are rejected;
              valid rows still import.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={pending || !importFile}
              onClick={handleImport}
            >
              Import SKUs
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={closeForm}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

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
          initial={formFromSku(editingSku)}
          submitLabel="Save changes"
          onSubmit={handleUpdate}
          onCancel={closeForm}
          pending={pending}
        />
      ) : null}

      {skus.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {canWrite
            ? "No SKUs yet. Import a CSV/JSON file or add products with width and height in millimeters."
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
                <th className="px-4 py-2 font-semibold">Shape</th>
                <th className="px-4 py-2 font-semibold">Color</th>
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
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {sku.shape === "CAN"
                      ? "Can"
                      : sku.shape === "BOTTLE"
                        ? "Bottle"
                        : "Flat"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="size-4 shrink-0 border"
                        style={{ backgroundColor: sku.color }}
                        title={sku.color}
                        aria-hidden
                      />
                      <span className="font-mono text-xs uppercase">{sku.color}</span>
                    </span>
                  </td>
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
                            setImportSummary(null);
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
