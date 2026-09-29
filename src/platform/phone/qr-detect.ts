/**
 * The browser's own QR reader, the Barcode Detection API. Chrome on
 * Android has it, and some other browsers do. No QR decoding library is
 * installed, so where the API is missing the scan button stays hidden and
 * the typed code is the way in.
 */

interface DetectedBarcode {
  rawValue: string;
}

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorClass {
  new (options?: { formats: string[] }): BarcodeDetectorLike;
  getSupportedFormats?(): Promise<string[]>;
}

function detectorClass(): BarcodeDetectorClass | null {
  if (typeof window === "undefined") return null;
  const found = (window as unknown as { BarcodeDetector?: BarcodeDetectorClass }).BarcodeDetector;
  return found ?? null;
}

/** True when this browser can read QR codes from the camera. */
export async function canScanQr(): Promise<boolean> {
  const Detector = detectorClass();
  if (!Detector || !navigator.mediaDevices?.getUserMedia) return false;
  try {
    const formats = (await Detector.getSupportedFormats?.()) ?? ["qr_code"];
    return formats.includes("qr_code");
  } catch {
    return false;
  }
}

/** A reader for QR codes only. Null where the API is missing. */
export function makeQrReader(): ((frame: CanvasImageSource) => Promise<string[]>) | null {
  const Detector = detectorClass();
  if (!Detector) return null;
  const detector = new Detector({ formats: ["qr_code"] });
  return async (frame) => (await detector.detect(frame)).map((code) => code.rawValue);
}
