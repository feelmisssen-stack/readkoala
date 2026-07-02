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
      const video = videoRef.current;
      if (!video) return;

      try {
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
          delayBetweenScanAttempts: 120,
        });

        if (cancelled) return;

        controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          video,
          (result) => {
            if (!result || cancelled) return;

            const text = normalizeIsbn(result.getText());
            if (!isLikelyIsbn(text)) return;

            onScanRef.current(text);
            setActive(false);
          }
        );
      } catch {
        if (!cancelled) {
          setError("카메라를 사용할 수 없어요. ISBN을 직접 입력해 주세요.");
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
          className="absolute inset-0 h-full w-full object-cover"
          muted
          playsInline
          autoPlay
        />
        <div
          className="pointer-events-none absolute inset-3 rounded-koala border border-koala-primary/70"
          aria-hidden
        />
      </div>
      <p className="text-xs text-koala-muted">책 뒷면 바코드를 가로로 화면 안에 맞춰 주세요.</p>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button type="button" onClick={() => setActive(false)} className="koala-btn-secondary text-sm">
        스캔 닫기
      </button>
    </div>
  );
}
