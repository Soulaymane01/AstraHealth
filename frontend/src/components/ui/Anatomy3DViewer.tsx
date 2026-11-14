import { RotateCcw, Scan, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type * as Three from "three";
import type { OrbitControls as OrbitControlsType } from "three/examples/jsm/controls/OrbitControls.js";

import { STATUS_META, type Status } from "@/lib/status";
import { cn } from "@/lib/utils";

import type { AnatomyMapProps } from "./anatomy-types";

type LayerKey = "skin" | "muscular" | "skeletal";

interface LayerDefinition {
  key: LayerKey;
  file: string;
  color: number;
  roughness: number;
}

interface LayerState extends LayerDefinition {
  base: Three.MeshStandardMaterial;
  hi: Three.MeshStandardMaterial;
  ghost: Three.MeshBasicMaterial;
  group: Three.Group | null;
  meshes: Three.Mesh[];
  promise: Promise<Three.Group> | null;
}

interface ViewerApi {
  showLayer: (key: LayerKey) => Promise<void>;
  setSpin: (on: boolean) => void;
  setGhost: (on: boolean) => void;
  setView: (theta: number) => void;
  resetView: () => void;
  refreshMaterials: () => void;
}

const LAYERS: LayerDefinition[] = [
  { key: "skin", file: "skin", color: 0xd9a48b, roughness: 0.62 },
  { key: "muscular", file: "muscles", color: 0xb23b36, roughness: 0.48 },
  { key: "skeletal", file: "skeleton", color: 0xe9dfc6, roughness: 0.58 },
];

const TABS: { key: LayerKey; label: string }[] = [
  { key: "skin", label: "Skin" },
  { key: "muscular", label: "Muscular" },
  { key: "skeletal", label: "Skeletal" },
];

const DOMAIN_REGIONS: { test: RegExp; domain: string; label: string }[] = [
  {
    test: /skull|cranium|cranial|mandible|maxilla|frontal|temporal|parietal|occipital|zygomatic|masseter|orbicularis|nasal|sphenoid|ethmoid|hyoid|platysma|sternocleido|auricular|orbital|buccal|mental|facial|head|face|neck/i,
    domain: "neurobehavioral",
    label: "Head & neck",
  },
  {
    test: /pector|presternal|sternal|sternum|rib|costal|intercostal|serratus anterior|thorax|thorac|mammary|infraclavicular|clavicular|axilla/i,
    domain: "cardiovascular",
    label: "Chest & heart",
  },
  {
    test: /spin|vertebra|lumbar|sacrum|coccyx|erector|scapula|trapezius|latissimus|rhomboid|back/i,
    domain: "musculoskeletal",
    label: "Spine & back",
  },
  {
    test: /abdominis|oblique|linea alba|abdom|umbilical|epigastric|hypogastric|hypochondriac|inguinal|core/i,
    domain: "metabolic",
    label: "Core",
  },
  {
    test: /deltoid|humerus|biceps|triceps|brachialis|supraspinatus|infraspinatus|teres|clavicle|shoulder|arm/i,
    domain: "musculoskeletal",
    label: "Shoulder & arm",
  },
  {
    test: /radius|ulna|carpal|metacarp|pollicis|digit|flexor|extensor|hand|forearm|wrist/i,
    domain: "musculoskeletal",
    label: "Forearm & hand",
  },
  {
    test: /pelvi|ilium|ischium|pubis|gluteus|iliopsoas|hip/i,
    domain: "musculoskeletal",
    label: "Hip & pelvis",
  },
  {
    test: /femur|quadriceps|rectus femoris|vastus|biceps femoris|semitendinosus|semimembranosus|adductor|sartorius|gracilis|patella|thigh|knee/i,
    domain: "musculoskeletal",
    label: "Thigh & knee",
  },
  {
    test: /tibia|fibula|gastrocnemius|soleus|tibialis|fibularis|peroneus|tarsal|metatars|calcane|talus|foot|leg|ankle/i,
    domain: "musculoskeletal",
    label: "Leg & foot",
  },
];

function classify(name: string): { domain: string; label: string } {
  const region = DOMAIN_REGIONS.find((candidate) => candidate.test.test(name));
  return region
    ? { domain: region.domain, label: region.label }
    : { domain: "musculoskeletal", label: "Musculoskeletal" };
}

function structureName(object: Three.Object3D): string {
  const raw = (object.userData?.zname as string | undefined) || object.name || "Structure";
  return raw
    .replace(/\.(l|r|s)$/i, "")
    .replace(/\.\d+$/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusFor(regions: AnatomyMapProps["regions"], domain: string): Status {
  return regions[domain]?.status ?? "unknown";
}

export function Anatomy3DViewer({
  regions,
  selectedDomain,
  onSelectDomain,
  className,
  onFallback,
}: AnatomyMapProps & { onFallback: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hintRef = useRef<HTMLSpanElement>(null);
  const apiRef = useRef<ViewerApi | null>(null);
  const stateRef = useRef({ regions, selectedDomain, onSelectDomain, onFallback });
  const [layer, setLayer] = useState<LayerKey>("skin");
  const [spin, setSpin] = useState(false);
  const [ghost, setGhost] = useState(false);
  const [loadingLayer, setLoadingLayer] = useState<LayerKey | null>("skin");
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    stateRef.current = { regions, selectedDomain, onSelectDomain, onFallback };
  }, [regions, selectedDomain, onSelectDomain, onFallback]);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | null = null;
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const base = import.meta.env.BASE_URL;
    const cdn = "https://cdn.jsdelivr.net/gh/alex-chan/3d-human-body-anatomy@main/web/public/models/";

    Promise.all([
      import("three"),
      import("three/examples/jsm/controls/OrbitControls.js"),
      import("three/examples/jsm/loaders/GLTFLoader.js"),
      import("three/examples/jsm/loaders/DRACOLoader.js"),
    ])
      .then(([THREE, controlsModule, gltfModule, dracoModule]) => {
        if (disposed) return;
        const { OrbitControls } = controlsModule;
        const { GLTFLoader } = gltfModule;
        const { DRACOLoader } = dracoModule;

        let renderer: Three.WebGLRenderer;
        try {
          renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        } catch {
          stateRef.current.onFallback();
          return;
        }

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 60);
        camera.position.set(0, 1, 5);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.setClearColor(0x000000, 0);

        scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x1a2030, 1.25));
        const key = new THREE.DirectionalLight(0xfff3e6, 2.4);
        key.position.set(2, 3, 4);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0xdce7f2, 0.55);
        rim.position.set(-3, 2, -3);
        scene.add(rim);
        const fill = new THREE.DirectionalLight(0xffffff, 0.35);
        fill.position.set(3, 0, -2);
        scene.add(fill);

        const controls: OrbitControlsType = new OrbitControls(camera, canvas);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.screenSpacePanning = true;
        controls.autoRotate = false;
        controls.autoRotateSpeed = 1.1;
        controls.addEventListener("start", () => {
          controls.autoRotate = false;
        });

        const loader = new GLTFLoader();
        const draco = new DRACOLoader();
        draco.setDecoderPath(`${base}draco/`);
        loader.setDRACOLoader(draco);

        const layers = {} as Record<LayerKey, LayerState>;
        for (const definition of LAYERS) {
          const baseMaterial = new THREE.MeshStandardMaterial({
            color: definition.color,
            roughness: definition.roughness,
            metalness: 0,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 1,
          });
          const highlight = baseMaterial.clone();
          highlight.emissive = new THREE.Color(0x0b3d91);
          highlight.emissiveIntensity = 0.55;
          layers[definition.key] = {
            ...definition,
            base: baseMaterial,
            hi: highlight,
            ghost: new THREE.MeshBasicMaterial({
              color: 0x0b3d91,
              transparent: true,
              opacity: 0.08,
              depthWrite: false,
              side: THREE.DoubleSide,
            }),
            group: null,
            meshes: [],
            promise: null,
          };
        }

        let fit: { center: Three.Vector3; distance: number } | null = null;
        let activeLayer: LayerKey = "skin";
        let ghostOn = false;
        let cameraTween:
          | {
              from: Three.Spherical;
              to: Three.Spherical;
              start: number;
            }
          | null = null;
        let frameVisible = true;

        const fitCamera = (group: Three.Group) => {
          if (fit) return;
          const box = new THREE.Box3().setFromObject(group);
          const center = box.getCenter(new THREE.Vector3());
          const height = box.max.y - box.min.y;
          const distance =
            (height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))) * 1.3;
          fit = { center, distance };
          controls.target.copy(center);
          controls.minDistance = distance * 0.2;
          controls.maxDistance = distance * 2.2;
          camera.position.set(center.x, center.y + height * 0.04, center.z + distance);
          camera.far = distance * 12;
          camera.updateProjectionMatrix();
          setReady(true);
        };

        const classifyMeshes = (key: LayerKey, group: Three.Group) => {
          const state = layers[key];
          group.traverse((object) => {
            const mesh = object as Three.Mesh;
            if (!mesh.isMesh) return;
            const name = structureName(mesh);
            const region = classify(name);
            mesh.userData.domain = region.domain;
            mesh.userData.regionLabel = region.label;
            mesh.material = state.base;
            state.meshes.push(mesh);
          });
          state.group = group;
          scene.add(group);
          group.visible = false;
        };

        const loadLayer = (key: LayerKey): Promise<Three.Group> => {
          const state = layers[key];
          if (state.group) return Promise.resolve(state.group);
          if (state.promise) return state.promise;
          const local = `${base}models/${state.file}.glb`;
          const remote = `${cdn}${state.file}.glb`;
          state.promise = new Promise<Three.Group>((resolve, reject) => {
            const tryLoad = (urls: string[], index = 0) => {
              if (index >= urls.length) {
                reject(new Error(`Unable to load ${state.file}.glb`));
                return;
              }
              loader.load(
                urls[index],
                (gltf) => {
                  if (disposed) return;
                  classifyMeshes(key, gltf.scene);
                  fitCamera(gltf.scene);
                  resolve(gltf.scene);
                },
                undefined,
                () => tryLoad(urls, index + 1),
              );
            };
            tryLoad([local, remote]);
          }).catch((error) => {
            state.promise = null;
            throw error;
          });
          return state.promise;
        };

        const refreshMaterials = () => {
          const selected = stateRef.current.selectedDomain;
          const status = statusFor(stateRef.current.regions, selected);
          const highlightHex = STATUS_META[status].hex;
          const hasSelection = selected !== "sleep";
          const wholeBody = selected === "immune";

          for (const state of Object.values(layers)) {
            if (!state.group) continue;
            const isActive = state.key === activeLayer;
            const showGhost = state.key === "skin" && ghostOn && activeLayer !== "skin";
            state.group.visible = isActive || showGhost;
            if (!state.group.visible) continue;
            state.hi.emissive.set(highlightHex);
            for (const mesh of state.meshes) {
              if (showGhost) {
                mesh.material = state.ghost;
                continue;
              }
              const matches =
                hasSelection &&
                (wholeBody || mesh.userData.domain === selected);
              mesh.material = matches ? state.hi : state.base;
            }
          }
        };

        const showLayer = async (next: LayerKey) => {
          activeLayer = next;
          if (!layers[next].group) {
            setLoadingLayer(next);
            try {
              await loadLayer(next);
              if (disposed) return;
              setFailed(false);
            } catch {
              if (disposed) return;
              setLoadingLayer(null);
              if (next === "skin") {
                stateRef.current.onFallback();
              } else {
                setFailed(true);
              }
              return;
            }
          }
          if (disposed) return;
          setLoadingLayer(null);
          if (hintRef.current) {
            hintRef.current.textContent = "Drag to rotate · scroll to zoom · click a structure";
          }
          refreshMaterials();
        };

        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        let pointerDown: { x: number; y: number } | null = null;
        let lastHover = 0;

        const pick = (event: PointerEvent): Three.Object3D | null => {
          const group = layers[activeLayer]?.group;
          if (!group) return null;
          const rect = canvas.getBoundingClientRect();
          pointer.set(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1,
          );
          raycaster.setFromCamera(pointer, camera);
          const hit = raycaster.intersectObject(group, true)[0];
          return hit?.object ?? null;
        };

        const onPointerMove = (event: PointerEvent) => {
          if (event.buttons) return;
          const now = performance.now();
          if (now - lastHover < 90) return;
          lastHover = now;
          const object = pick(event);
          if (hintRef.current) {
            hintRef.current.textContent = object
              ? `${structureName(object)} · click to inspect`
              : "Drag to rotate · scroll to zoom · click a structure";
          }
          canvas.style.cursor = object ? "pointer" : "grab";
        };

        const onPointerDown = (event: PointerEvent) => {
          pointerDown = { x: event.clientX, y: event.clientY };
        };

        const onPointerUp = (event: PointerEvent) => {
          if (
            !pointerDown ||
            Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 4
          ) {
            pointerDown = null;
            return;
          }
          pointerDown = null;
          const object = pick(event);
          if (!object) return;
          const domain = (object.userData.domain as string | undefined) ?? "musculoskeletal";
          const region = (object.userData.regionLabel as string | undefined) ?? "";
          stateRef.current.onSelectDomain(domain);
          if (hintRef.current) {
            hintRef.current.textContent = `${structureName(object)} · ${region}`;
          }
        };

        canvas.addEventListener("pointermove", onPointerMove);
        canvas.addEventListener("pointerdown", onPointerDown);
        canvas.addEventListener("pointerup", onPointerUp);

        const resize = () => {
          const width = host.clientWidth;
          const height = host.clientHeight;
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        };
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
        resize();

        const intersectionObserver = new IntersectionObserver(([entry]) => {
          frameVisible = entry.isIntersecting;
        });
        intersectionObserver.observe(host);

        const animateCamera = (theta: number, phi: number, radius?: number) => {
          if (!fit) return;
          controls.autoRotate = false;
          const current = new THREE.Spherical().setFromVector3(
            camera.position.clone().sub(controls.target),
          );
          let delta = theta - current.theta;
          delta = Math.atan2(Math.sin(delta), Math.cos(delta));
          cameraTween = {
            from: current,
            to: new THREE.Spherical(
              radius ?? current.radius,
              phi,
              current.theta + delta,
            ),
            start: performance.now(),
          };
        };

        renderer.setAnimationLoop((now) => {
          if (!frameVisible) return;
          if (cameraTween) {
            const progress = Math.min(1, (now - cameraTween.start) / 650);
            const eased = progress * progress * (3 - 2 * progress);
            const spherical = new THREE.Spherical(
              THREE.MathUtils.lerp(cameraTween.from.radius, cameraTween.to.radius, eased),
              THREE.MathUtils.lerp(cameraTween.from.phi, cameraTween.to.phi, eased),
              THREE.MathUtils.lerp(cameraTween.from.theta, cameraTween.to.theta, eased),
            );
            camera.position.setFromSpherical(spherical).add(controls.target);
            if (progress >= 1) cameraTween = null;
          }
          controls.update();
          renderer.render(scene, camera);
        });

        const resetView = () => {
          if (!fit) return;
          controls.target.copy(fit.center);
          animateCamera(0, 1.5, fit.distance);
        };

        apiRef.current = {
          showLayer,
          setSpin: (on) => {
            controls.autoRotate = on;
          },
          setGhost: (on) => {
            ghostOn = on;
            refreshMaterials();
          },
          setView: (theta) => {
            if (hintRef.current) {
              hintRef.current.textContent = "Drag to rotate · scroll to zoom · click a structure";
            }
            animateCamera(theta, 1.5);
          },
          resetView: () => {
            if (hintRef.current) {
              hintRef.current.textContent = "Drag to rotate · scroll to zoom · click a structure";
            }
            resetView();
          },
          refreshMaterials,
        };

        // Keep the first layer quick, then warm the other two in the background.
        setLoadingLayer("skin");
        loadLayer("skin")
          .then(() => {
            if (disposed) return;
            setLoadingLayer(null);
            setReady(true);
            refreshMaterials();
            void loadLayer("muscular").catch(() => {});
            void loadLayer("skeletal").catch(() => {});
          })
          .catch(() => {
            if (disposed) return;
            setLoadingLayer(null);
            stateRef.current.onFallback();
          });

        cleanup = () => {
          apiRef.current = null;
          resizeObserver.disconnect();
          intersectionObserver.disconnect();
          canvas.removeEventListener("pointermove", onPointerMove);
          canvas.removeEventListener("pointerdown", onPointerDown);
          canvas.removeEventListener("pointerup", onPointerUp);
          renderer.setAnimationLoop(null);
          controls.dispose();
          draco.dispose();
          for (const state of Object.values(layers)) {
            state.base.dispose();
            state.hi.dispose();
            state.ghost.dispose();
            state.group?.traverse((object) => {
              const mesh = object as Three.Mesh;
              if (mesh.isMesh) mesh.geometry.dispose();
            });
          }
          renderer.dispose();
        };
      })
      .catch(() => {
        if (!disposed) stateRef.current.onFallback();
      });

    return () => {
      disposed = true;
      cleanup?.();
      cleanup = null;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    void apiRef.current?.showLayer(layer);
  }, [layer, ready]);

  useEffect(() => {
    if (!ready) return;
    apiRef.current?.setSpin(spin);
  }, [spin, ready]);

  useEffect(() => {
    if (!ready) return;
    apiRef.current?.setGhost(ghost);
  }, [ghost, ready]);

  useEffect(() => {
    if (!ready) return;
    apiRef.current?.refreshMaterials();
  }, [regions, selectedDomain, ready]);

  const selected = regions[selectedDomain];
  const selectedStatus = selected?.status ?? "unknown";
  const selectedMeta = STATUS_META[selectedStatus];

  return (
    <div className={cn("mt-3", className)}>
      <div
        ref={hostRef}
        className="relative flex min-h-[430px] items-center justify-center overflow-hidden rounded-2xl border border-line bg-[linear-gradient(180deg,#E2EEFA,#CFE0F3)] sm:min-h-[540px]"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none"
          role="img"
          aria-label="Interactive 3D human anatomy model"
        />

        <div className="pointer-events-none absolute left-3 right-3 top-3 z-10 flex flex-wrap items-start justify-between gap-2">
          <span
            data-testid="anatomy-chip"
            className="pointer-events-auto inline-flex max-w-[55%] items-center gap-1.5 rounded-full border border-line-strong bg-surface/85 px-2.5 py-1 text-[10px] font-medium text-ink shadow-sm backdrop-blur"
          >
            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", selectedMeta.dot)} />
            <span className="truncate">{selected?.label ?? "Whole body"}</span>
            <span className={cn("shrink-0", selectedMeta.text)}>{selectedMeta.label}</span>
          </span>

          <div
            className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-line-strong bg-surface/85 p-0.5 shadow-sm backdrop-blur"
            role="tablist"
            aria-label="Anatomy layer"
          >
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={layer === tab.key}
                onClick={() => setLayer(tab.key)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors",
                  layer === tab.key
                    ? "bg-accent-soft text-accent"
                    : "text-muted hover:text-ink",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-end justify-between gap-2">
          <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-1 rounded-full border border-line bg-surface/85 p-0.5 shadow-sm backdrop-blur">
            {[
              { label: "Front", theta: 0 },
              { label: "Back", theta: Math.PI },
              { label: "Left", theta: Math.PI / 2 },
              { label: "Right", theta: -Math.PI / 2 },
            ].map((view) => (
              <button
                key={view.label}
                type="button"
                onClick={() => apiRef.current?.setView(view.theta)}
                className="rounded-full px-2 py-1 text-[10px] text-muted transition-colors hover:text-ink"
              >
                {view.label}
              </button>
            ))}
          </div>

          <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-1 rounded-full border border-line bg-surface/85 p-0.5 shadow-sm backdrop-blur">
            <button
              type="button"
              aria-pressed={ghost}
              onClick={() => setGhost((current) => !current)}
              className={cn(
                "rounded-full px-2 py-1 text-[10px] transition-colors",
                ghost ? "bg-accent-soft text-accent" : "text-muted hover:text-ink",
              )}
            >
              X-ray
            </button>
            <button
              type="button"
              aria-pressed={spin}
              onClick={() => setSpin((current) => !current)}
              className={cn(
                "rounded-full px-2 py-1 text-[10px] transition-colors",
                spin ? "bg-accent-soft text-accent" : "text-muted hover:text-ink",
              )}
            >
              Spin
            </button>
            <button
              type="button"
              aria-label="Reset view"
              onClick={() => apiRef.current?.resetView()}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted hover:text-ink"
            >
              <RotateCcw size={11} aria-hidden />
            </button>
          </div>
        </div>

        <span
          ref={hintRef}
          data-testid="anatomy-hint"
          className="pointer-events-none absolute bottom-16 left-1/2 z-10 max-w-[80%] -translate-x-1/2 truncate text-center text-[9px] text-muted"
        >
          Drag to rotate · scroll to zoom · click a structure
        </span>

        {loadingLayer && (
          <div className="absolute inset-0 z-20 grid place-content-center gap-2 bg-surface/60 text-center backdrop-blur-[2px]">
            <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Scan size={16} className="animate-pulse" aria-hidden />
            </span>
            <span className="text-[11px] font-medium text-ink">Loading {loadingLayer}…</span>
          </div>
        )}

        {failed && (
          <div className="absolute inset-x-3 bottom-16 z-20 flex items-center justify-between gap-2 rounded-xl border border-watch/30 bg-watch-soft px-3 py-2 text-[10px] text-watch">
            <span>That layer could not be loaded.</span>
            <button
              type="button"
              onClick={() => onFallback()}
              className="font-semibold underline-offset-2 hover:underline"
            >
              Use 2D view
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
        <button
          type="button"
          onClick={() => onSelectDomain("immune")}
          aria-pressed={selectedDomain === "immune"}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
            selectedDomain === "immune"
              ? "border-accent/30 bg-accent-soft text-accent"
              : "border-line bg-surface text-ink-2 hover:border-line-strong",
          )}
        >
          <ShieldCheck size={12} className={STATUS_META[statusFor(regions, "immune")].text} aria-hidden />
          Whole body
          <span className={cn("text-[10px]", STATUS_META[statusFor(regions, "immune")].text)}>
            {STATUS_META[statusFor(regions, "immune")].label}
          </span>
        </button>
        <span className="text-right text-[10px] text-muted">3D · skin, muscle, bone</span>
      </div>

    </div>
  );
}
