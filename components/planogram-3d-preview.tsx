"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { PlanogramLayout, PlanogramState } from "@/lib/planogram-engine/types";
import {
  buildPlanogram3DScene,
  type Planogram3DScene,
  type SceneSkuLookup,
} from "@/lib/planogram-3d/scene-from-layout";
import { buildPackagingMesh } from "@/lib/skus/packaging-mesh";

const RADIAL_SEGMENTS = 24;
const SHELF_COLOR = "#e4e4e7";
const SHELF_LIP_COLOR = "#dedee2";
const BACKBOARD_COLOR = "#b4b4bb";
const BACKGROUND = "#f4f4f5";
const GROUND_COLOR = "#f7f7f8";
const GROUND_GRID_MAJOR = "#e4e4e7";
const GROUND_GRID_MINOR = "#eeeeef";
/** Ground plane size relative to bay footprint (Blender-like expanse). */
const GROUND_SIZE_FACTOR = 6;
/** Minor grid cell size in mm. */
const GROUND_CELL_MM = 100;
/** Soft shelf-edge lip height above the deck (mm). */
const SHELF_LIP_HEIGHT_MM = 5;
/** Soft shelf-edge lip thickness (mm). */
const SHELF_LIP_THICKNESS_MM = 4;
/** Pegboard hole pitch in mm (dotted cutout). */
const BACKBOARD_HOLE_PITCH_MM = 25;
/** Pegboard hole diameter in mm. */
const BACKBOARD_HOLE_DIAMETER_MM = 8;

function disposeObject(root: THREE.Object3D) {
  const disposed = new Set<THREE.Material>();
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.geometry.dispose();
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (const entry of materials) {
        if (disposed.has(entry)) continue;
        disposed.add(entry);
        const std = entry as THREE.MeshStandardMaterial;
        std.map?.dispose();
        std.alphaMap?.dispose();
        entry.dispose();
      }
    }
    const lines = obj as THREE.LineSegments;
    if (lines.isLineSegments) {
      lines.geometry.dispose();
      const material = lines.material;
      if (Array.isArray(material)) {
        for (const entry of material) {
          if (disposed.has(entry)) continue;
          disposed.add(entry);
          entry.dispose();
        }
      } else if (!disposed.has(material as THREE.Material)) {
        disposed.add(material as THREE.Material);
        (material as THREE.Material).dispose();
      }
    }
  });
}

/** Cached 1-cell pegboard canvas — textures repeat this tile via UV. */
let pegboardTileCanvas: HTMLCanvasElement | null = null;

function getPegboardTileCanvas(): HTMLCanvasElement {
  if (pegboardTileCanvas) return pegboardTileCanvas;

  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#c4c4cc";
  ctx.fillRect(0, 0, size, size);

  const holeRadius =
    (BACKBOARD_HOLE_DIAMETER_MM / BACKBOARD_HOLE_PITCH_MM) * (size / 2);
  // Soft recessed “hole” (mapped, not alpha-cut).
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    holeRadius * 0.15,
    size / 2,
    size / 2,
    holeRadius,
  );
  gradient.addColorStop(0, "#3f3f46");
  gradient.addColorStop(0.7, "#52525b");
  gradient.addColorStop(1, "#c4c4cc");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, holeRadius, 0, Math.PI * 2);
  ctx.fill();

  pegboardTileCanvas = canvas;
  return canvas;
}

function pegboardFaceMap(
  widthMm: number,
  heightMm: number,
): THREE.CanvasTexture {
  const map = new THREE.CanvasTexture(getPegboardTileCanvas());
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.anisotropy = 4;
  map.repeat.set(
    Math.max(1, widthMm / BACKBOARD_HOLE_PITCH_MM),
    Math.max(1, heightMm / BACKBOARD_HOLE_PITCH_MM),
  );
  map.needsUpdate = true;
  return map;
}

function addBoxPanel(
  parent: THREE.Group,
  panel: { position: { x: number; y: number; z: number }; size: { width: number; height: number; depth: number } },
  color: string,
  options?: { roughness?: number; metalness?: number; edges?: boolean },
) {
  const geometry = new THREE.BoxGeometry(
    panel.size.width,
    panel.size.height,
    panel.size.depth,
  );
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: options?.roughness ?? 0.9,
    metalness: options?.metalness ?? 0.02,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(panel.position.x, panel.position.y, panel.position.z);

  if (options?.edges) {
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry, 20),
      new THREE.LineBasicMaterial({
        color: "#52525b",
        transparent: true,
        opacity: 0.45,
      }),
    );
    mesh.add(edges);
  }

  parent.add(mesh);
}

function addBackboard(
  parent: THREE.Group,
  backdrop: NonNullable<Planogram3DScene["backdrop"]>,
) {
  const faceMap = pegboardFaceMap(backdrop.size.width, backdrop.size.height);

  const faceMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#ffffff"),
    map: faceMap,
    roughness: 0.92,
    metalness: 0,
  });
  const edgeMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(BACKBOARD_COLOR),
    roughness: 0.95,
    metalness: 0,
  });

  // Box materials: +x, -x, +y, -y, +z, -z — solid thickness on edges;
  // front/back use a repeating pegboard map (no alpha cutouts).
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(
      backdrop.size.width,
      backdrop.size.height,
      backdrop.size.depth,
    ),
    [
      edgeMaterial,
      edgeMaterial,
      edgeMaterial,
      edgeMaterial,
      faceMaterial,
      faceMaterial,
    ],
  );
  board.position.set(
    backdrop.position.x,
    backdrop.position.y,
    backdrop.position.z,
  );
  parent.add(board);

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(board.geometry, 20),
    new THREE.LineBasicMaterial({
      color: "#52525b",
      transparent: true,
      opacity: 0.4,
    }),
  );
  board.add(edges);
}

function addShelfBoard(
  parent: THREE.Group,
  shelf: Planogram3DScene["shelves"][number],
) {
  addBoxPanel(parent, shelf, SHELF_COLOR, {
    roughness: 0.75,
    metalness: 0.08,
  });
  addShelfLips(parent, shelf);
}

/** Soft U-shaped lip on front + left/right edges (no back — backboard sits there). */
function addShelfLips(
  parent: THREE.Group,
  shelf: Planogram3DScene["shelves"][number],
) {
  const { x, y, z } = shelf.position;
  const { width, height, depth } = shelf.size;
  const topY = y + height / 2;
  const lipY = topY + SHELF_LIP_HEIGHT_MM / 2;
  const t = SHELF_LIP_THICKNESS_MM;
  const h = SHELF_LIP_HEIGHT_MM;

  const lips: Array<{
    position: { x: number; y: number; z: number };
    size: { width: number; height: number; depth: number };
  }> = [
    // Front rail
    {
      position: {
        x,
        y: lipY,
        z: z + depth / 2 - t / 2,
      },
      size: { width, height: h, depth: t },
    },
    // Left rail (stops short of front lip to avoid corner overlap)
    {
      position: {
        x: x - width / 2 + t / 2,
        y: lipY,
        z: z - t / 2,
      },
      size: { width: t, height: h, depth: depth - t },
    },
    // Right rail
    {
      position: {
        x: x + width / 2 - t / 2,
        y: lipY,
        z: z - t / 2,
      },
      size: { width: t, height: h, depth: depth - t },
    },
  ];

  for (const lip of lips) {
    addBoxPanel(parent, lip, SHELF_LIP_COLOR, {
      roughness: 0.8,
      metalness: 0.04,
    });
  }
}

/**
 * Blender-style floor: large XZ plane + grid under the bay.
 * Placed at the bottom of scene bounds so the fixture sits on the ground.
 */
function addGround(
  parent: THREE.Group,
  bounds: Planogram3DScene["bounds"],
) {
  const spanX = Math.max(bounds.maxX - bounds.minX, 1);
  const spanZ = Math.max(bounds.maxZ - bounds.minZ, 1);
  const size = Math.max(spanX, spanZ) * GROUND_SIZE_FACTOR;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;
  const groundY = bounds.minY - 1;

  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(GROUND_COLOR),
      roughness: 1,
      metalness: 0,
      transparent: false,
      opacity: 1,
    }),
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.set(centerX, groundY, centerZ);
  plane.receiveShadow = false;
  parent.add(plane);

  const divisions = Math.max(2, Math.round(size / GROUND_CELL_MM));
  const grid = new THREE.GridHelper(
    size,
    divisions,
    GROUND_GRID_MAJOR,
    GROUND_GRID_MINOR,
  );
  grid.position.set(centerX, groundY + 0.5, centerZ);
  const gridMats = Array.isArray(grid.material)
    ? grid.material
    : [grid.material];
  for (const material of gridMats) {
    const lineMat = material as THREE.LineBasicMaterial;
    lineMat.transparent = true;
    lineMat.opacity = 0.35;
    lineMat.depthWrite = false;
  }
  parent.add(grid);
}

function addSceneItem(
  parent: THREE.Group,
  item: Planogram3DScene["items"][number],
) {
  let geometry: THREE.BufferGeometry;
  let offsetY = 0;
  const itemMesh = item.mesh;
  const isPackaging = itemMesh.kind === "packaging";

  if (itemMesh.kind === "packaging") {
    const meshData = buildPackagingMesh(itemMesh.packaging, {
      radialSegments: RADIAL_SEGMENTS,
    });
    geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(meshData.vertices, 3),
    );
    geometry.setIndex(meshData.indices);
    geometry.computeVertexNormals();
  } else {
    geometry = new THREE.BoxGeometry(
      itemMesh.width,
      itemMesh.height,
      itemMesh.depth,
    );
    offsetY = itemMesh.height / 2;
  }

  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(item.color),
    flatShading: false,
    metalness: 0,
    roughness: 0.85,
    transparent: false,
    opacity: 1,
    depthWrite: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(
    item.position.x,
    item.position.y + offsetY,
    item.position.z,
  );

  // Edge overlay only for box extrusions — facets look wrong on round packs.
  if (!isPackaging) {
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry, 25),
      new THREE.LineBasicMaterial({
        color: "#27272a",
        transparent: true,
        opacity: 0.3,
      }),
    );
    mesh.add(edges);
  }
  parent.add(mesh);
}

function frameCamera(
  camera: THREE.PerspectiveCamera,
  bounds: Planogram3DScene["bounds"],
  spherical: { radius: number; theta: number; phi: number },
  target: THREE.Vector3,
) {
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  const cz = (bounds.minZ + bounds.maxZ) / 2;
  target.set(cx, cy, cz);

  const sizeX = Math.max(bounds.maxX - bounds.minX, 1);
  const sizeY = Math.max(bounds.maxY - bounds.minY, 1);
  const sizeZ = Math.max(bounds.maxZ - bounds.minZ, 1);
  const radius = Math.max(sizeX, sizeY, sizeZ) * 1.35;

  spherical.radius = radius;
  spherical.theta = Math.PI * 0.22;
  spherical.phi = Math.PI * 0.38;
  applySpherical(camera, target, spherical);
}

function applySpherical(
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  spherical: { radius: number; theta: number; phi: number },
) {
  const { radius, theta, phi } = spherical;
  camera.position.set(
    target.x + radius * Math.sin(phi) * Math.sin(theta),
    target.y + radius * Math.cos(phi),
    target.z + radius * Math.sin(phi) * Math.cos(theta),
  );
  camera.lookAt(target);
}

/**
 * Read-only planogram 3D scaffold: shelves + packaging mesh or box extrusion.
 * Orbit: left-drag rotate · wheel zoom. Fit via `fitToken` bump.
 */
export default function Planogram3DPreview({
  layout,
  state,
  skuById,
  fitToken = 0,
  className = "h-full w-full bg-muted/20",
}: {
  layout: PlanogramLayout;
  state: PlanogramState;
  skuById: ReadonlyMap<string, SceneSkuLookup>;
  /** Increment to reframe the camera (toolbar Fit). */
  fitToken?: number;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fitRef = useRef<(token: number) => void>(() => {});

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const sceneDesc = buildPlanogram3DScene(layout, state, skuById);

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 480;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BACKGROUND);

    const camera = new THREE.PerspectiveCamera(40, width / height, 1, 50000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";

    const root = new THREE.Group();
    scene.add(root);

    addGround(root, sceneDesc.bounds);
    if (sceneDesc.backdrop) {
      addBackboard(root, sceneDesc.backdrop);
    }
    for (const shelf of sceneDesc.shelves) {
      addShelfBoard(root, shelf);
    }
    for (const item of sceneDesc.items) {
      addSceneItem(root, item);
    }

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    const key = new THREE.DirectionalLight(0xffffff, 0.75);
    key.position.set(400, 800, 500);
    const fill = new THREE.DirectionalLight(0xffffff, 0.3);
    fill.position.set(-500, 200, -300);
    scene.add(ambient, key, fill);

    const target = new THREE.Vector3();
    const spherical = { radius: 1000, theta: 0.7, phi: 1.1 };
    frameCamera(camera, sceneDesc.bounds, spherical, target);

    let frame = 0;
    let disposed = false;
    const animate = () => {
      if (disposed) return;
      frame = requestAnimationFrame(animate);
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

    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      spherical.theta -= dx * 0.005;
      spherical.phi = Math.min(
        Math.PI * 0.92,
        Math.max(0.12, spherical.phi + dy * 0.005),
      );
      applySpherical(camera, target, spherical);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const factor = event.deltaY > 0 ? 1.08 : 0.92;
      spherical.radius = Math.min(
        50000,
        Math.max(80, spherical.radius * factor),
      );
      applySpherical(camera, target, spherical);
    };

    fitRef.current = () => {
      frameCamera(camera, sceneDesc.bounds, spherical, target);
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      disposeObject(root);
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [layout, state, skuById]);

  useEffect(() => {
    fitRef.current(fitToken);
  }, [fitToken]);

  return (
    <div
      ref={containerRef}
      className={className}
      aria-label="Planogram 3D preview"
      role="img"
    />
  );
}
