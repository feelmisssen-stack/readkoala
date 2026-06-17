"use client";

import { useEffect, useRef, useState } from "react";

interface IsbnScannerProps {
  onScan: (isbn: string) => void;
}

export function IsbnScanner({ onScan }: IsbnScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!active) return;

    let controls: { stop: () => void } | null = null;

    async function start() {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result) => {
            if (result) {
              const text = result.getText().replace(/[-\s]/g, "");
              if (text.length >= 10) {
                onScan(text);
                setActive(false);
              }
            }
          }
        );
      } catch {
        setError("카메라를 사용할 수 없어요. ISBN을 직접 입력해 주세요.");
        setActive(false);
      }
    }

    start();
    return () => {
      controls?.stop();
      const video = videoRef.current;
      const stream = video?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [active, onScan]);

  if (!active) {
    return (
      <button type="button" onClick={() => setActive(true)} className="koala-btn-secondary text-sm">
        📷 바코드 스캔
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <video ref={videoRef} className="w-full rounded-koala bg-black" muted playsInline />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button type="button" onClick={() => setActive(false)} className="koala-btn-secondary text-sm">
        스캔 닫기
      </button>
    </div>
  );
}
