import { Camera, Check, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";

import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { analyzePpg, type PpgResult, type PpgSample } from "@/features/camera/ppg";
import { cn } from "@/lib/utils";

const MEASURE_MS = 25_000;
const WASM_BASE =
  import.meta.env.VITE_MEDIAPIPE_WASM_URL ??
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm";
const MODEL_URL =
  import.meta.env.VITE_MEDIAPIPE_MODEL_URL ??
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

type CameraStatus =
  "idle" | "requesting" | "loading" | "measuring" | "analyzing" | "result" | "error";

interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function cameraErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "Camera permission was denied. Use the heart-rate field above, or allow the camera and try again.";
    }
    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      return "No camera was found. Use the heart-rate field above.";
    }
    if (error.name === "NotReadableError" || error.name === "TrackStartError") {
      return "The camera is in use by another app. Close it and try again, or use the field above.";
    }
  }
  return "The camera could not start. Check the connection and permissions, or use the heart-rate field above.";
}

function meterToPixel(value: number, size: number): number {
  return Math.max(0, Math.min(size - 1, Math.round(value * size)));
}

function sampleGreen(video: HTMLVideoElement, box: Box, canvas: HTMLCanvasElement): number | null {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return null;

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(video, 0, 0, width, height);

  const boxWidth = (box.maxX - box.minX) * width;
  const boxHeight = (box.maxY - box.minY) * height;
  const patch = Math.max(3, Math.round(Math.min(boxWidth, boxHeight) * 0.14));
  const centers = [
    {
      x: meterToPixel((box.minX + box.maxX) / 2, width),
      y: meterToPixel(box.minY + (box.maxY - box.minY) * 0.24, height),
    },
    {
      x: meterToPixel(box.minX + (box.maxX - box.minX) * 0.28, width),
      y: meterToPixel(box.minY + (box.maxY - box.minY) * 0.58, height),
    },
    {
      x: meterToPixel(box.minX + (box.maxX - box.minX) * 0.72, width),
      y: meterToPixel(box.minY + (box.maxY - box.minY) * 0.58, height),
    },
  ];

  let sum = 0;
  let count = 0;
  for (const center of centers) {
    const left = Math.max(0, center.x - Math.floor(patch / 2));
    const top = Math.max(0, center.y - Math.floor(patch / 2));
    const sampleWidth = Math.min(patch, width - left);
    const sampleHeight = Math.min(patch, height - top);
    if (sampleWidth <= 0 || sampleHeight <= 0) continue;
    const data = context.getImageData(left, top, sampleWidth, sampleHeight).data;
    for (let index = 1; index < data.length; index += 4) {
      sum += data[index];
      count += 1;
    }
  }
  return count > 0 ? sum / count : null;
}

export function PulseCamera({
  onMeasured,
}: {
  onMeasured: (bpm: number, confidence: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const analysisTimerRef = useRef<number | null>(null);
  const samplesRef = useRef<PpgSample[]>([]);
  const startRef = useRef(0);
  const lastFrameRef = useRef(0);
  const progressRef = useRef(0);
  const faceFramesRef = useRef(0);
  const totalFramesRef = useRef(0);
  const motionRef = useRef(0);
  const lastBoxRef = useRef<Box | null>(null);
  const runIdRef = useRef(0);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<PpgResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stopLoop = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const closeLandmarker = () => {
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
  };

  const cleanup = () => {
    // Invalidate any in-flight start() so a late getUserMedia/model load cannot
    // reactivate the camera after Cancel or unmount.
    runIdRef.current += 1;
    stopLoop();
    stopStream();
    closeLandmarker();
    if (analysisTimerRef.current !== null) {
      window.clearTimeout(analysisTimerRef.current);
      analysisTimerRef.current = null;
    }
  };

  useEffect(() => () => cleanup(), []);

  const finish = () => {
    stopLoop();
    stopStream();
    closeLandmarker();
    setStatus("analyzing");
    setProgress(100);
    const total = totalFramesRef.current;
    const faces = faceFramesRef.current;
    const faceCoverage = total > 0 ? faces / total : 0;
    const motionScore = faces > 1 ? motionRef.current / (faces - 1) : 0;

    analysisTimerRef.current = window.setTimeout(() => {
      analysisTimerRef.current = null;
      const analysis = analyzePpg(samplesRef.current, {
        faceCoverage,
        motionScore,
      });
      setResult(analysis);
      if (analysis.quality === "poor") {
        setStatus("error");
        setError(analysis.reason ?? "The signal was too noisy. Try again.");
      } else {
        setStatus("result");
      }
    }, 40);
  };

  const detect = () => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !landmarker) return;

    // oxlint-disable-next-line react/purity -- detect runs from requestAnimationFrame, never during render
    const now = performance.now();
    const elapsed = now - startRef.current;
    if (now - lastFrameRef.current < 1000 / 30) {
      rafRef.current = requestAnimationFrame(detect);
      return;
    }
    lastFrameRef.current = now;

    if (video.readyState >= 2) {
      totalFramesRef.current += 1;
      const output = landmarker.detectForVideo(video, now);
      const face = output.faceLandmarks?.[0];
      if (face && face.length > 0) {
        faceFramesRef.current += 1;
        let minX = 1;
        let minY = 1;
        let maxX = 0;
        let maxY = 0;
        for (const point of face) {
          minX = Math.min(minX, point.x);
          minY = Math.min(minY, point.y);
          maxX = Math.max(maxX, point.x);
          maxY = Math.max(maxY, point.y);
        }
        const box: Box = { minX, minY, maxX, maxY };
        if (lastBoxRef.current) {
          motionRef.current += Math.hypot(
            (box.minX + box.maxX) / 2 - (lastBoxRef.current.minX + lastBoxRef.current.maxX) / 2,
            (box.minY + box.maxY) / 2 - (lastBoxRef.current.minY + lastBoxRef.current.maxY) / 2,
          );
        }
        lastBoxRef.current = box;

        const canvas = canvasRef.current ?? document.createElement("canvas");
        canvasRef.current = canvas;
        const sample = sampleGreen(video, box, canvas);
        if (sample !== null) {
          samplesRef.current.push({ t: now - startRef.current, value: sample });
        }
      }

      const nextProgress = Math.min(100, (elapsed / MEASURE_MS) * 100);
      if (Math.floor(nextProgress / 5) !== Math.floor(progressRef.current / 5)) {
        progressRef.current = nextProgress;
        setProgress(nextProgress);
      }
    }

    if (elapsed >= MEASURE_MS) {
      finish();
      return;
    }
    rafRef.current = requestAnimationFrame(detect);
  };

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setError("This browser does not expose a camera. Use the heart-rate field above.");
      return;
    }

    cleanup();
    const runId = runIdRef.current;

    setStatus("requesting");
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    if (runIdRef.current !== runId) return;
    setError(null);
    setResult(null);
    setProgress(0);
    samplesRef.current = [];
    startRef.current = performance.now();
    lastFrameRef.current = 0;
    progressRef.current = 0;
    faceFramesRef.current = 0;
    totalFramesRef.current = 0;
    motionRef.current = 0;
    lastBoxRef.current = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      if (runIdRef.current !== runId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("Video element unavailable");
      video.srcObject = stream;
      await video.play();
      if (runIdRef.current !== runId) {
        stopStream();
        return;
      }

      setStatus("loading");
      const media = await import("@mediapipe/tasks-vision");
      if (runIdRef.current !== runId) {
        stopStream();
        return;
      }
      const fileset = await media.FilesetResolver.forVisionTasks(WASM_BASE);
      if (runIdRef.current !== runId) {
        stopStream();
        return;
      }
      let landmarker: FaceLandmarker;
      try {
        landmarker = await media.FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numFaces: 1,
          minFaceDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });
      } catch {
        landmarker = await media.FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
          runningMode: "VIDEO",
          numFaces: 1,
          minFaceDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });
      }
      if (runIdRef.current !== runId) {
        landmarker.close();
        stopStream();
        return;
      }
      landmarkerRef.current = landmarker;
      setStatus("measuring");
      rafRef.current = requestAnimationFrame(detect);
    } catch (caught) {
      if (runIdRef.current !== runId) return;
      cleanup();
      setStatus("error");
      setError(cameraErrorMessage(caught));
    }
  };

  const reset = () => {
    cleanup();
    setStatus("idle");
    setProgress(0);
    setResult(null);
    setError(null);
  };

  const useReading = () => {
    if (!result) return;
    onMeasured(result.bpm, result.confidence);
    reset();
  };

  if (status === "idle") {
    return (
      <div className="mt-3 flex flex-col gap-2 rounded-xl border border-line bg-surface-muted/40 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium text-ink">Camera pulse</p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
            Forehead scan · 25 s · on-device.
          </p>
        </div>
        <Button variant="secondary" size="sm" className="shrink-0" onClick={start}>
          <Camera size={13} aria-hidden />
          Measure
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-line bg-surface-muted/40 px-3.5 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-ink">
          <Camera size={13} className="text-accent" aria-hidden />
          Camera pulse
        </p>
        <button
          type="button"
          onClick={reset}
          aria-label="Close camera pulse"
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink"
        >
          <X size={14} aria-hidden />
        </button>
      </div>

      {(status === "requesting" || status === "loading" || status === "measuring") && (
        <div className="mt-2 grid gap-3 sm:grid-cols-[minmax(0,220px)_1fr] sm:items-center">
          <video
            ref={videoRef}
            muted
            playsInline
            autoPlay
            aria-label="Camera preview for pulse measurement"
            className="aspect-[4/3] w-full rounded-lg bg-ink object-cover [-webkit-transform:scaleX(-1)] [transform:scaleX(-1)]"
          />
          <div>
            <div className="flex items-center gap-2 text-[11px] text-muted">
              {status === "requesting" ? (
                <>
                  <Spinner className="text-accent" /> Requesting camera…
                </>
              ) : status === "loading" ? (
                <>
                  <Spinner className="text-accent" /> Loading the face model…
                </>
              ) : (
                "Hold still. Forehead and cheeks in frame."
              )}
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-300"
                style={{ width: `${status === "measuring" ? progress : 0}%` }}
              />
            </div>
            <p className="mt-2 text-[10px] text-muted">
              {status === "measuring"
                ? `${Math.round(25 - (progress / 100) * 25)} seconds left`
                : "Your video is not uploaded."}
            </p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={reset}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {status === "analyzing" && (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-surface px-3 py-3 text-[11px] text-muted">
          <Spinner className="text-accent" />
          Analyzing the pulse…
        </div>
      )}

      {status === "result" && result && (
        <div className="mt-2 flex flex-col gap-3 rounded-lg bg-surface px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] text-muted">Estimated pulse</p>
            <p className="text-3xl font-semibold tabular tracking-tight text-ink">
              {result.bpm}
              <span className="ml-1 text-xs font-normal text-muted">bpm</span>
            </p>
            <p className="mt-1 text-[10px] text-muted">
              Signal quality {Math.round(result.confidence * 100)}% · {result.quality}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="sm" onClick={useReading}>
              <Check size={12} aria-hidden />
              Use this reading
            </Button>
            <Button variant="secondary" size="sm" onClick={start}>
              <RotateCcw size={12} aria-hidden />
              Try again
            </Button>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="mt-2 rounded-lg border border-watch/20 bg-watch-soft px-3 py-3">
          <p className="text-[11px] leading-relaxed text-watch">{error}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={start}>
              <RotateCcw size={12} aria-hidden />
              Try again
            </Button>
            <Button variant="ghost" size="sm" onClick={reset}>
              Enter manually
            </Button>
          </div>
        </div>
      )}

      <p className={cn("mt-2 text-[10px] text-muted", status === "error" && "sr-only")}>
        Guidance only. The camera estimate is not a medical measurement.
      </p>
    </div>
  );
}
