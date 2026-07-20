"use client";

import { PackagingMeshCanvas } from "@/components/sku-packaging-mesh-preview";
import { SkuPackagingFacePreview } from "@/components/sku-packaging-face-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSku } from "@/lib/skus/actions";
import {
  type ShapeMode,
  type SkuFormState,
  derivedFacePreview,
  formFromSku,
  livePackagingFromForm,
  parseForm,
} from "@/lib/skus/form-state";
import type { SkuDetail } from "@/lib/skus/queries";
import { isValidSkuFootprint } from "@/lib/validation/sku";
import { cn } from "@/lib/utils";
import { WORKSPACE_READ_ONLY_HINT } from "@/lib/workspaces/capabilities";
import {
  ArrowLeftIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

function clearParametricFields() {
  return {
    bodyDiameterMm: "",
    heightMm: "",
    endDiameterMm: "",
    baseDiameterMm: "",
    neckDiameterMm: "",
    capacityMl: "",
  };
}

export default function SkuPackagingEditor({
  sku,
  canWrite,
}: {
  sku: SkuDetail;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [values, setValues] = useState<SkuFormState>(() => formFromSku(sku));
  const [error, setError] = useState<string | null>(null);
  const [savedHint, setSavedHint] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const facePreview = derivedFacePreview(values);
  const live = livePackagingFromForm(values);
  const livePackaging = live.ok ? live.data : null;
  const liveFace = live.ok ? live.face : null;
  const isParametric = values.shape !== "NONE";
  const flatWidth = Number.parseInt(values.width, 10);
  const flatHeight = Number.parseInt(values.height, 10);
  const flatFace =
    !isParametric && isValidSkuFootprint(flatWidth, flatHeight)
      ? { width: flatWidth, height: flatHeight }
      : null;
  const face2d = liveFace ?? flatFace;

  const handleSave = () => {
    if (!canWrite) return;
    const parsed = parseForm(values);
    if (!parsed.ok) {
      setError(parsed.message);
      setSavedHint(null);
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await updateSku({
        id: sku.id,
        name: parsed.data.name,
        sku: parsed.data.sku,
        width: parsed.data.width,
        height: parsed.data.height,
        color: parsed.data.color,
        imageUrl: parsed.data.imageUrl,
        shape: parsed.data.shape,
        packaging: parsed.data.packaging,
      });
      if (!result.ok) {
        setError(result.message);
        setSavedHint(null);
        return;
      }
      setSavedHint("Saved");
      setValues(formFromSku({ ...sku, ...result.data }));
      router.refresh();
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {!canWrite ? (
        <p className="shrink-0 border-b bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
          {WORKSPACE_READ_ONLY_HINT}
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          className={cn(
            "flex shrink-0 flex-col overflow-hidden border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out",
            sidebarOpen ? "w-80" : "w-11",
          )}
        >
          <div
            className={cn(
              "flex shrink-0 items-center border-b p-2",
              sidebarOpen ? "justify-between" : "justify-center",
            )}
          >
            {sidebarOpen ? (
              <h1 className="min-w-0 truncate px-2 font-mono text-sm font-semibold">
                {sku.name}
              </h1>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setSidebarOpen((open) => !open)}
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              aria-expanded={sidebarOpen}
            >
              {sidebarOpen ? (
                <PanelLeftCloseIcon className="size-4" />
              ) : (
                <PanelLeftOpenIcon className="size-4" />
              )}
            </Button>
          </div>

          {sidebarOpen ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4">
                <div className="mb-4 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    title="Back to SKUs"
                    aria-label="Back to SKUs"
                    asChild
                  >
                    <Link href="/skus">
                      <ArrowLeftIcon className="size-4" />
                    </Link>
                  </Button>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {sku.sku}
                  </p>
                </div>

                <form
                  className="flex flex-col gap-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleSave();
                  }}
                >
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Identity
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="pack-name">Name</Label>
                    <Input
                      id="pack-name"
                      value={values.name}
                      disabled={!canWrite || pending}
                      onChange={(event) =>
                        setValues((prev) => ({
                          ...prev,
                          name: event.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="pack-code">SKU code</Label>
                    <Input
                      id="pack-code"
                      value={values.sku}
                      disabled={!canWrite || pending}
                      onChange={(event) =>
                        setValues((prev) => ({
                          ...prev,
                          sku: event.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="pack-color">Display color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="pack-color"
                        type="color"
                        value={values.color}
                        disabled={!canWrite || pending}
                        onChange={(event) =>
                          setValues((prev) => ({
                            ...prev,
                            color: event.target.value,
                          }))
                        }
                        className="h-9 w-14 cursor-pointer p-1"
                      />
                      <Input
                        id="pack-color-hex"
                        type="text"
                        value={values.color}
                        disabled={!canWrite || pending}
                        onChange={(event) =>
                          setValues((prev) => ({
                            ...prev,
                            color: event.target.value,
                          }))
                        }
                        className="font-mono uppercase"
                        pattern="^#?[0-9A-Fa-f]{6}$"
                        maxLength={7}
                        aria-label="Display color hex"
                      />
                    </div>
                  </div>

                  <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Packaging
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="pack-shape">Shape</Label>
                    <select
                      id="pack-shape"
                      className="h-9 border border-border bg-background px-2 text-sm"
                      value={values.shape}
                      disabled={!canWrite || pending}
                      onChange={(event) => {
                        const next = event.target.value as ShapeMode;
                        setValues((prev) => ({
                          ...prev,
                          shape: next,
                          ...(next === "NONE" ? clearParametricFields() : {}),
                        }));
                        setError(null);
                        setSavedHint(null);
                      }}
                    >
                      <option value="NONE">Flat (width × height)</option>
                      <option value="CAN">Can</option>
                      <option value="BOTTLE">Bottle</option>
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Flat SKUs stay list-editable. Choose can/bottle here for
                      parametric dims and live preview.
                    </p>
                  </div>

                  {isParametric ? (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="pack-body">Body diameter (mm)</Label>
                        <Input
                          id="pack-body"
                          type="number"
                          min={1}
                          step="any"
                          value={values.bodyDiameterMm}
                          disabled={!canWrite || pending}
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
                        <Label htmlFor="pack-height">Height (mm)</Label>
                        <Input
                          id="pack-height"
                          type="number"
                          min={1}
                          step="any"
                          value={values.heightMm}
                          disabled={!canWrite || pending}
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
                          <Label htmlFor="pack-end">End/lid diameter (mm)</Label>
                          <Input
                            id="pack-end"
                            type="number"
                            min={1}
                            step="any"
                            value={values.endDiameterMm}
                            disabled={!canWrite || pending}
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
                          <Label htmlFor="pack-neck">Neck diameter (mm)</Label>
                          <Input
                            id="pack-neck"
                            type="number"
                            min={1}
                            step="any"
                            value={values.neckDiameterMm}
                            disabled={!canWrite || pending}
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
                        <Label htmlFor="pack-base">Base diameter (mm)</Label>
                        <Input
                          id="pack-base"
                          type="number"
                          min={1}
                          step="any"
                          value={values.baseDiameterMm}
                          disabled={!canWrite || pending}
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
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="pack-capacity">
                          Capacity (ml, optional)
                        </Label>
                        <Input
                          id="pack-capacity"
                          type="number"
                          min={1}
                          step="any"
                          value={values.capacityMl}
                          disabled={!canWrite || pending}
                          onChange={(event) =>
                            setValues((prev) => ({
                              ...prev,
                              capacityMl: event.target.value,
                            }))
                          }
                          className="font-mono"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="pack-face-w">Face-on width</Label>
                          <Input
                            id="pack-face-w"
                            type="number"
                            value={facePreview?.width ?? ""}
                            className="font-mono"
                            readOnly
                            disabled
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="pack-face-h">Face-on height</Label>
                          <Input
                            id="pack-face-h"
                            type="number"
                            value={facePreview?.height ?? ""}
                            className="font-mono"
                            readOnly
                            disabled
                          />
                        </div>
                      </div>
                      {!live.ok ? (
                        <p className="text-sm text-destructive" role="alert">
                          {live.message}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="pack-flat-w">Width (mm)</Label>
                        <Input
                          id="pack-flat-w"
                          type="number"
                          min={1}
                          value={values.width}
                          disabled={!canWrite || pending}
                          onChange={(event) =>
                            setValues((prev) => ({
                              ...prev,
                              width: event.target.value,
                            }))
                          }
                          className="font-mono"
                          required
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="pack-flat-h">Height (mm)</Label>
                        <Input
                          id="pack-flat-h"
                          type="number"
                          min={1}
                          value={values.height}
                          disabled={!canWrite || pending}
                          onChange={(event) =>
                            setValues((prev) => ({
                              ...prev,
                              height: event.target.value,
                            }))
                          }
                          className="font-mono"
                          required
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Face-on width×height for the 2D planogram. Opt into
                        can/bottle above for parametric dims and 3D mesh.
                      </p>
                    </>
                  )}

                  {error ? (
                    <p className="text-sm text-destructive" role="alert">
                      {error}
                    </p>
                  ) : null}
                  {savedHint && !error ? (
                    <p className="text-sm text-muted-foreground" role="status">
                      {savedHint}
                    </p>
                  ) : null}

                  {canWrite ? (
                    <Button type="submit" size="sm" disabled={pending}>
                      {pending ? "Saving…" : "Save packaging"}
                    </Button>
                  ) : null}
                </form>
              </div>
            </div>
          ) : null}
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
          <div className="shrink-0 border-b px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Live preview
            </p>
            <p className="text-xs text-muted-foreground">
              {isParametric
                ? "2D face footprint and low-poly 3D mesh update as you edit dimensions."
                : "2D face footprint updates as you edit width and height."}
            </p>
          </div>

          {face2d ? (
            <div
              className={cn(
                "grid min-h-0 flex-1 gap-4 overflow-auto p-4",
                livePackaging ? "lg:grid-cols-2" : "",
              )}
            >
              <section className="flex min-h-0 flex-col gap-2">
                <h2 className="font-mono text-sm font-semibold">2D face</h2>
                <SkuPackagingFacePreview
                  widthMm={face2d.width}
                  heightMm={face2d.height}
                  color={values.color}
                  className="min-h-[220px] flex-1"
                />
              </section>
              {livePackaging ? (
                <section className="flex min-h-0 flex-col gap-2">
                  <h2 className="font-mono text-sm font-semibold">3D mesh</h2>
                  <PackagingMeshCanvas
                    packaging={livePackaging}
                    color={values.color}
                    className="min-h-[280px] w-full flex-1 border border-border bg-muted/20"
                  />
                </section>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8">
              <p className="max-w-sm text-center text-sm text-muted-foreground">
                {isParametric
                  ? "Enter valid can/bottle dimensions to see live 2D and 3D previews."
                  : "Enter positive width and height (mm) to see the 2D face preview."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
