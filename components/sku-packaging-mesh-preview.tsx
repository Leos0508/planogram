"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
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

export function PackagingMeshCanvas({
  packaging,
  color,
  className = "h-[280px] w-full border border-border bg-muted/20",
}: {
  packaging: SkuPackaging;
  color: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    lastX: number;
    lastY: number;
  } | null>(null);
  const orbitRef = useRef({ yaw: 0.55, pitch: 0.35, distanceScale: 1 });
  const apiRef = useRef<{
    camera: THREE.PerspectiveCamera;
    mesh: THREE.Object3D;
    radius: number;
    render: () => void;
  } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 280;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f4f4f5");

    const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 5000);
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
      metalness: 0.08,
      roughness: 0.55,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry, 22),
      new THREE.LineBasicMaterial({
        color: "#27272a",
        transparent: true,
        opacity: 0.28,
      }),
    );
    mesh.add(edges);

    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    const key = new THREE.DirectionalLight(0xffffff, 0.95);
    key.position.set(140, 240, 180);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(-120, 60, -140);
    const rim = new THREE.DirectionalLight(0xffffff, 0.2);
    rim.position.set(40, -80, 160);
    scene.add(ambient, key, fill, rim);

    geometry.computeBoundingSphere();
    const radius = geometry.boundingSphere?.radius ?? packaging.heightMm;
    const center = geometry.boundingSphere?.center ?? new THREE.Vector3();
    mesh.position.sub(center);

    const applyCamera = () => {
      const { yaw, pitch, distanceScale } = orbitRef.current;
      const distance = radius * 3.05 * distanceScale;
      const cp = Math.cos(pitch);
      camera.position.set(
        Math.sin(yaw) * cp * distance,
        Math.sin(pitch) * distance,
        Math.cos(yaw) * cp * distance,
      );
      camera.lookAt(0, 0, 0);
    };
    applyCamera();

    const render = () => {
      applyCamera();
      renderer.render(scene, camera);
    };
    apiRef.current = { camera, mesh, radius, render };

    let frame = 0;
    let disposed = false;
    const animate = () => {
      if (disposed) return;
      frame = requestAnimationFrame(animate);
      if (!dragRef.current) {
        orbitRef.current.yaw += 0.006;
      }
      render();
    };
    animate();

    const onResize = () => {
      const nextWidth = container.clientWidth || width;
      const nextHeight = container.clientHeight || height;
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
      render();
    };
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      apiRef.current = null;
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

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.lastX;
    const dy = event.clientY - drag.lastY;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    orbitRef.current.yaw -= dx * 0.01;
    orbitRef.current.pitch = Math.max(
      -1.2,
      Math.min(1.2, orbitRef.current.pitch + dy * 0.01),
    );
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  };

  const onWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const next = orbitRef.current.distanceScale * (event.deltaY > 0 ? 1.08 : 0.92);
    orbitRef.current.distanceScale = Math.max(0.55, Math.min(2.4, next));
  };

  return (
    <div
      ref={containerRef}
      className={`${className} touch-none cursor-grab active:cursor-grabbing`}
      aria-label="Packaging mesh preview. Drag to orbit, scroll to zoom."
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
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
  disabledReason = "Set can or bottle packaging to open the 3D mesh preview",
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
              <p className="text-xs text-muted-foreground">
                Drag to orbit · scroll to zoom ·{" "}
                <span className="font-mono">
                  {Math.round(target.packaging.bodyDiameterMm)} ×{" "}
                  {Math.round(target.packaging.heightMm)} mm
                </span>{" "}
                face-on
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Set can or bottle packaging on this SKU to preview its mesh.
            </p>
          )}

          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </>
  );
}
