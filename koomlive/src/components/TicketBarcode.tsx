import { useEffect, useRef, useState } from "react";
import bwipjs from "bwip-js/browser";
import type { MobileTicketResponse } from "../api/bridgeTypes";
import { useCountdown } from "../api/useCountdown";

type Barcode = MobileTicketResponse["barcode"];

/**
 * Renders the bridge's barcode value as a scannable PDF417 / QR code.
 * For rotating tickets, the pink bar underneath drains until `nextRotationAt`.
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
  const progress = secondsLeft !== null && interval > 0 ? Math.min(1, secondsLeft / interval) : 1;

  return (
    <div className="barcode-frame">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`${barcode.format} ticket barcode`}
        className={barcode.format === "QR" ? "barcode-canvas is-qr" : "barcode-canvas"}
      />
      {renderError && <p className="barcode-error">Could not render barcode: {renderError}</p>}
      {barcode.rotating && <div className="barcode-bar" style={{ width: `${progress * 100}%` }} />}
    </div>
  );
}