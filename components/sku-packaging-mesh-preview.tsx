"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildPackagingMesh } from "@/lib/skus/packaging-mesh";
import type { SkuPackaging } from "@/lib/skus/packaging";
import { BoxIcon } from "lucide-react";

type PreviewTarget = {
  name: string;
  color: string;
  packaging: SkuPackaging;
};

function PackagingMeshCanvas({
  packaging,
  color,
}: {
  packaging: SkuPackaging;
  color: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 280;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f4f4f5");

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 5000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const meshData = buildPackagingMesh(packaging, { radialSegments: 16 });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(meshData.vertices, 3),
    );
    geometry.setIndex(meshData.indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      flatShading: true,
      metalness: 0.05,
      roughness: 0.65,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry, 25),
      new THREE.LineBasicMaterial({ color: "#27272a", transparent: true, opacity: 0.35 }),
    );
    mesh.add(edges);

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    const key = new THREE.DirectionalLight(0xffffff, 0.7);
    key.position.set(120, 220, 160);
    const fill = new THREE.DirectionalLight(0xffffff, 0.25);
    fill.position.set(-100, 80, -120);
    scene.add(ambient, key, fill);

    geometry.computeBoundingSphere();
    const radius = geometry.boundingSphere?.radius ?? packaging.heightMm;
    const center = geometry.boundingSphere?.center ?? new THREE.Vector3();
    mesh.position.sub(center);

    const distance = radius * 3.2;
    camera.position.set(distance * 0.7, distance * 0.45, distance * 0.85);
    camera.lookAt(0, 0, 0);

    let frame = 0;
    let disposed = false;
    const animate = () => {
      if (disposed) return;
      frame = requestAnimationFrame(animate);
      mesh.rotation.y += 0.008;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const nextWidth = container.clientWidth || width;
      const nextHeight = container.clientHeight || height;
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      geometry.dispose();
      material.dispose();
      edges.geometry.dispose();
      (edges.material as THREE.Material).dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [packaging, color]);

  return (
    <div
      ref={containerRef}
      className="h-[280px] w-full border border-border bg-muted/20"
      aria-label="Packaging mesh preview"
    />
  );
}

/**
 * Read-only 3D preview for a parametric can/bottle SKU.
 * Disabled (with hint) when packaging is missing.
 */
export function SkuPackagingMeshPreviewButton({
  name,
  color,
  packaging,
  disabled,
  disabledReason = "Add can/bottle packaging to preview 3D",
  variant = "ghost",
  size = "icon-sm",
  label,
}: {
  name: string;
  color: string;
  packaging: SkuPackaging | null;
  disabled?: boolean;
  disabledReason?: string;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<PreviewTarget | null>(null);

  const canPreview = packaging != null && !disabled;

  const openPreview = () => {
    if (!packaging) return;
    setTarget({ name, color, packaging });
    setOpen(true);
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        title={canPreview ? `Preview 3D · ${name}` : disabledReason}
        disabled={!canPreview}
        aria-label={canPreview ? `Preview 3D mesh for ${name}` : disabledReason}
        onClick={openPreview}
      >
        <BoxIcon className="size-4" />
        {label ? <span className="ml-1.5">{label}</span> : null}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>3D packaging</DialogTitle>
            <DialogDescription>
              {target
                ? `${target.name} · ${target.packaging.shape === "CAN" ? "Can" : "Bottle"} · solid fill ${target.color}`
                : "Low-poly mesh from parametric dimensions."}
            </DialogDescription>
          </DialogHeader>

          {target ? (
            <div className="flex flex-col gap-2">
              <PackagingMeshCanvas
                packaging={target.packaging}
                color={target.color}
              />
              <p className="font-mono text-xs text-muted-foreground">
                {Math.round(target.packaging.bodyDiameterMm)} ×{" "}
                {Math.round(target.packaging.heightMm)} mm face-on · read-only
                preview
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Add can/bottle packaging to preview 3D.
            </p>
          )}

          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </>
  );
}
