import { useEffect, useRef, useState } from "react";
import bwipjs from "bwip-js/browser";
import type { MobileTicketResponse } from "../api/bridgeTypes";
import { useCountdown } from "../api/useCountdown";

type Barcode = MobileTicketResponse["barcode"];

/**
 * Renders the bridge's barcode value as a scannable PDF417 / QR code.
 * For rotating tickets, the blue bar underneath drains until `nextRotationAt`.
 */
export default function TicketBarcode({ barcode }: { barcode: Barcode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    try {
      bwipjs.toCanvas(
        canvasRef.current,
        barcode.format === "QR"
          ? { bcid: "qrcode", text: barcode.value, scale: 4 }
          : { bcid: "pdf417", text: barcode.value, scale: 2 },
      );
      setRenderError(null);
    } catch (err) {
      setRenderError(err instanceof Error ? err.message : String(err));
    }
  }, [barcode.format, barcode.value]);

  // Rotation progress (rotating barcodes only)
  const secondsLeft = useCountdown(barcode.rotating ? barcode.nextRotationAt : undefined);
  const interval = barcode.rotatesEverySeconds ?? 0;
  const progress =
    secondsLeft !== null && interval > 0 ? Math.min(1, secondsLeft / interval) : 1;

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        padding: "10px 12px 14px",
        background: "#fff",
        marginBottom: 6,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`${barcode.format} ticket barcode`}
        style={{
          display: "block",
          margin: "0 auto",
          maxWidth: barcode.format === "QR" ? 160 : "100%",
          height: "auto",
          imageRendering: "pixelated",
        }}
      />
      {renderError && (
        <div className="font-mono-display" style={{ fontSize: 9, color: "#b3261e", marginTop: 6 }}>
          Could not render barcode: {renderError}
        </div>
      )}

      {/* Blue bar: drains until the next rotation (SafeTix-style indicator) */}
      {barcode.rotating && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            height: 6,
            width: `${progress * 100}%`,
            background: "linear-gradient(90deg, #0047ff, #4488ff, #0047ff)",
            opacity: 0.9,
            transition: "width 1s linear",
          }}
        />
      )}
    </div>
  );
}