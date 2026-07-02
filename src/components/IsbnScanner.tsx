"use client";

import { useEffect, useRef, useState } from "react";
import { ScanBarcode } from "lucide-react";
import { iconSm } from "@/lib/icon-styles";

interface IsbnScannerProps {
  onScan: (isbn: string) => void;
}

function normalizeIsbn(raw: string) {
  return raw.replace(/[-\s]/g, "");
}

function isLikelyIsbn(value: string) {
  return /^\d{10}(\d{3})?$/.test(value) || /^\d{13}$/.test(value);
}

function isSecureCameraContext() {
  if (typeof window === "undefined") return true;
  return window.isSecureContext;
}

async function waitForVideoElement(video: HTMLVideoElement) {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  if (video.isConnected) return;
  await new Promise<void>((resolve) => {
    const timer = window.setTimeout(resolve, 50);
    const observer = new MutationObserver(() => {
      if (video.isConnected) {
        window.clearTimeout(timer);
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
}

async function startScanner(
  video: HTMLVideoElement,
  onResult: (isbn: string) => void
): Promise<{ stop: () => void }> {
  const { BrowserMultiFormatReader } = await import("@zxing/browser");
  const { BarcodeFormat, DecodeHintType } = await import("@zxing/library");

  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
  ]);
  hints.set(DecodeHintType.TRY_HARDER, true);

  const reader = new BrowserMultiFormatReader(hints, {
    delayBetweenScanAttempts: 100,
    tryPlayVideoTimeout: 10000,
  });

  const handleResult = (result: import("@zxing/library").Result | undefined) => {
    if (!result) return;
    const text = normalizeIsbn(result.getText());
    if (!isLikelyIsbn(text)) return;
    onResult(text);
  };

  const mobileVideo = {
    facingMode: { ideal: "environment" as const },
    width: { min: 640, ideal: 1920 },
    height: { min: 480, ideal: 1080 },
    // @ts-expect-error focusMode is supported on many mobile browsers
    focusMode: { ideal: "continuous" },
  };

  const attempts: Array<() => Promise<{ stop: () => void }>> = [
    async () => {
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      const rear =
        [...devices].reverse().find((device) => /back|rear|environment|후면/i.test(device.label)) ??
        devices.at(-1);
      if (!rear) throw new Error("no rear camera");
      return reader.decodeFromVideoDevice(rear.deviceId, video, handleResult);
    },
    () =>
      reader.decodeFromConstraints(
        { audio: false, video: { ...mobileVideo, facingMode: { exact: "environment" } } },
        video,
        handleResult
      ),
    () => reader.decodeFromConstraints({ audio: false, video: mobileVideo }, video, handleResult),
    () => reader.decodeFromConstraints({ audio: false, video: { facingMode: "environment" } }, video, handleResult),
    () => reader.decodeFromVideoDevice(undefined, video, handleResult),
  ];

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("camera start failed");
}

export function IsbnScanner({ onScan }: IsbnScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let controls: { stop: () => void } | null = null;

    async function start() {
      if (!isSecureCameraContext()) {
        setError("휴대폰에서는 https 주소(또는 localhost)에서만 카메라를 쓸 수 있어요.");
        setActive(false);
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      await waitForVideoElement(video);
      if (cancelled) return;

      try {
        controls = await startScanner(video, (isbn) => {
          if (cancelled) return;
          onScanRef.current(isbn);
          setActive(false);
        });
      } catch {
        if (!cancelled) {
          setError(
            "카메라를 사용할 수 없어요. 브라우저에서 카메라 허용 후 다시 시도하거나, ISBN을 직접 입력해 주세요."
          );
          setActive(false);
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [active]);

  if (!active) {
    return (
      <button
        type="button"
        onClick={() => {
          setError("");
          setActive(true);
        }}
        className="koala-btn-secondary inline-flex items-center gap-2 text-sm"
      >
        <ScanBarcode className={iconSm} aria-hidden />
        바코드 스캔
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative aspect-[5/2] w-full max-w-xl overflow-hidden rounded-koala border border-koala-secondary bg-black">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-contain"
          muted
          playsInline
          autoPlay
        />
        <div
          className="pointer-events-none absolute inset-3 rounded-koala border border-koala-primary/70"
          aria-hidden
        />
      </div>
      <p className="text-xs text-koala-muted">
        책 뒷면 바코드를 가로로 화면 안에 맞춰 주세요. 밝은 곳에서 10~15cm 거리가 좋아요.
      </p>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button type="button" onClick={() => setActive(false)} className="koala-btn-secondary text-sm">
        스캔 닫기
      </button>
    </div>
  );
}
