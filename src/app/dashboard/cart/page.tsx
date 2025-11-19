"use client";

import React, { useEffect, useState, useRef } from 'react';
import { getCart, removeFromCart, clearCart, addToCart, type CartItem } from '@/lib/cart';
import { useRouter } from 'next/navigation';
import styles from '@/styles/home.module.css';

export default function CartPageClient() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [storeCredit, setStoreCredit] = useState<number>(0);
  const [waiting, setWaiting] = useState(false);
  const [waitingCheckoutId, setWaitingCheckoutId] = useState<string | null>(null);
  const [waitingError, setWaitingError] = useState<string | null>(null);
  const router = useRouter();
  const pollingIdRef = useRef<number | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const detectorRef = useRef<any>(null);
  const readerRef = useRef<any>(null);
  const scannedRef = useRef<boolean>(false);
  const scanSessionRef = useRef<number>(0);
  const [decoderUsed, setDecoderUsed] = useState<string | null>(null);
  const [videoSize, setVideoSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [lastDecoded, setLastDecoded] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastCaptureAttemptRef = useRef<number | null>(null);

  useEffect(() => {
    setCart(getCart());
  }, []);

  function handleRemove(id: string) {
    removeFromCart(id);
    setCart(getCart());
  }

  const total = cart.reduce((s, it) => s + (it.price || 0) * (it.quantity || 1), 0);
  const totalAfterCredit = Math.max(0, +(total - (storeCredit || 0)).toFixed(2));

  async function handleCheckout() {
    if (cart.length === 0) return;
    setLoading(true);
    setMessage(null);
    try {
      // Build line items for Square API from client cart
      const lineItems = cart.map((c) => ({
        name: c.name,
        quantity: c.quantity || 1,
        price: c.price || 0,
        // include the internal item id so the webhook handler can map back if desired
        sku: c.id,
      }));

      const res = await fetch('/api/square/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineItems, storeCreditAmount: storeCredit }),
      });

      const body = await res.json();
      if (!res.ok) {
        setMessage(body?.error || 'Failed to create terminal checkout');
        setLoading(false);
        return;
      }

      const checkoutId = body?.checkoutId;
      if (!checkoutId) {
        setMessage('No checkout id returned from Square');
        setLoading(false);
        return;
      }

      // Show waiting UI and poll status endpoint for completion
      setWaitingCheckoutId(checkoutId);
      setWaiting(true);
      setWaitingError(null);
      // start polling
      startPolling(checkoutId);
    } catch (e) {
      console.error(e);
      setMessage('Failed to process transaction');
    } finally {
      setLoading(false);
    }
  }

  // Polling function checks our server for a transaction created for this checkoutId
  function startPolling(checkoutId: string) {
    let attempts = 0;
    const maxAttempts = 60; // ~2 minutes if interval=2000
    const interval = 2000;

  const id = setInterval(async () => {
      attempts += 1;
      try {
        const res = await fetch(`/api/square/checkout/status?checkoutId=${encodeURIComponent(checkoutId)}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setWaitingError(body?.error || `Status check failed (${res.status})`);
          // continue polling unless max attempts
        } else {
          const body = await res.json();
          if (body?.status === 'COMPLETED') {
            if (pollingIdRef.current) clearInterval(pollingIdRef.current);
            setWaiting(false);
            setWaitingCheckoutId(null);
            // success: clear client cart and show toast message (do not navigate)
            clearCart();
            setCart([]);
            setMessage('Payment completed');
            // auto-dismiss toast after 5s
            setTimeout(() => setMessage(null), 5000);
            return;
          }
        }
      } catch (err) {
        console.error('Polling error', err);
        setWaitingError('Polling error');
      }

      if (attempts >= maxAttempts) {
        if (pollingIdRef.current) clearInterval(pollingIdRef.current);
        setWaiting(false);
        setWaitingError('Timed out waiting for terminal payment.');
      }
    }, interval);
    // store id so we can clear from elsewhere
    // @ts-ignore
    pollingIdRef.current = id as unknown as number;
  }

  function cancelWaiting() {
    if (pollingIdRef.current) {
      clearInterval(pollingIdRef.current);
      pollingIdRef.current = null;
    }
    setWaiting(false);
    setWaitingCheckoutId(null);
    setWaitingError('Cancelled by user');
  }

  useEffect(() => {
    return () => {
      if (pollingIdRef.current) clearInterval(pollingIdRef.current);
    };
  }, []);

  async function startScanner() {
    setScanError(null);
    setScanning(true);
    scannedRef.current = false;
    // bump session id so any stale callbacks from previous reader are ignored
    scanSessionRef.current = (scanSessionRef.current || 0) + 1;
    const mySession = scanSessionRef.current;
    // clear previous decoded UI value
    setLastDecoded(null);

    try {
  // Request camera access (prefer environment camera) and request higher resolution
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } });
      streamRef.current = stream;
      if (videoRef.current) {
        // ensure autoplay will be allowed: mute the element
        try {
          videoRef.current.muted = true;
        } catch {}
        videoRef.current.srcObject = stream;
        // wait for metadata so video dimensions are available for canvas fallback
        await new Promise<void>((resolve) => {
          const v = videoRef.current!;
          if (v.readyState >= 2) return resolve();
          const onMeta = () => {
            v.removeEventListener('loadedmetadata', onMeta);
            resolve();
          };
          v.addEventListener('loadedmetadata', onMeta);
        });
        await videoRef.current.play();
          // update measured video size so UI diagnostics show correct values
          try {
            const vid = videoRef.current!;
            setVideoSize({ w: vid.videoWidth || 0, h: vid.videoHeight || 0 });
          } catch {}
      }

      // Use BarcodeDetector if available
      if ((window as any).BarcodeDetector) {
        const formats = ['qr_code'];
        // @ts-ignore
        detectorRef.current = new (window as any).BarcodeDetector({ formats });
        setDecoderUsed('BarcodeDetector');
        // start detection after video is playing
        pollDetect();
      } else {
        // Dynamic import ZXing browser decoder as a robust fallback
        try {
          const mod = await import('@zxing/browser');
          // @ts-ignore
          const { BrowserQRCodeReader } = mod;
          // ensure any previous reader is reset to avoid lingering callbacks
          try { if (readerRef.current) { await readerRef.current.reset?.(); } } catch {}
          // create reader and start decoding from the video element
          const reader = new BrowserQRCodeReader();
          readerRef.current = reader;
          setDecoderUsed('ZXing');
          // Prefer selecting a rear/environment camera if available to improve detection.
          try {
            // listVideoInputDevices is a static helper on BrowserQRCodeReader
            // @ts-ignore
            const devices = await BrowserQRCodeReader.listVideoInputDevices();
            // video devices enumerated
            let preferredId: string | undefined = undefined;
            if (devices && devices.length > 0) {
              // try to find a label hinting at back/rear/environment camera
              const back = devices.find((d: any) => /back|rear|environment|rear camera|back camera/i.test(d.label || ''));
              preferredId = (back && back.deviceId) || devices[0].deviceId;
            }

            // decodeFromVideoDevice will select the specified deviceId and stream; pass preferredId if found
            // it accepts deviceId or undefined, and a video element or elementId
            // @ts-ignore
            reader.decodeFromVideoDevice(preferredId, videoRef.current!, (result: any, err: any) => {
              try {
                if (mySession !== scanSessionRef.current) return;
                if (err) {
                  // ZXing reports NotFoundException frequently when no barcode is in-frame; suppress that as noisy.
                  const name = err?.name || (err && String(err).split(':')[0]);
                    // expected: NotFoundException when no barcode in frame; other errors are handled below

                  // If we see a ChecksumException, try a single-shot higher-resolution capture to improve decode
                  try {
                    const isChecksum = /ChecksumException/i.test(String(name || err));
                    const now = Date.now();
                    if (isChecksum && (!lastCaptureAttemptRef.current || now - lastCaptureAttemptRef.current > 1200)) {
                      lastCaptureAttemptRef.current = now;
                      (async () => {
                        try {
                          const v = videoRef.current;
                          if (!v) return;
                          const canvas = document.createElement('canvas');
                          const scale = 2;
                          const w = v.videoWidth || 640;
                          const h = v.videoHeight || 480;
                          canvas.width = Math.max(320, Math.floor(w * scale));
                          canvas.height = Math.max(240, Math.floor(h * scale));
                          const ctx = canvas.getContext('2d');
                          if (!ctx) return;
                          // draw scaled image to improve decoder sampling
                          ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
                          // @ts-ignore - some versions expose decodeFromCanvas
                          if (typeof reader.decodeFromCanvas === 'function') {
                            try {
                              const single = await reader.decodeFromCanvas(canvas);
                              if (single && single.getText) {
                                const txt = single.getText();
                                // single-shot decoded text
                                setLastDecoded(String(txt));
                                Promise.resolve().then(() => handleScannedValue(String(txt))).catch((e) => console.error('[ZXing] handleScannedValue error', e));
                                return;
                              }
                            } catch (se) {
                              console.debug('[ZXing] single-shot decode failed', se);
                            }
                          }
                          } catch (inner) {
                          console.error('[ZXing] single-shot capture error', inner);
                        }
                      })();
                    }
                  } catch (xx) {
                    // ignore
                  }
                }
                if (result && result.getText) {
                  // Prevent duplicate processing of the same scan
                  if (scannedRef.current) return;
                  scannedRef.current = true;
                  const text = result.getText();
                          // decoded text received
                          setLastDecoded(String(text));
                          // stop the scanner immediately to avoid repeated callbacks
                          try { if (readerRef.current) { try { readerRef.current.reset(); } catch {} } } catch {}
                          stopScanner();
                          Promise.resolve().then(() => handleScannedValue(String(text))).catch((e) => console.error('[ZXing] handleScannedValue error', e));
                }
              } catch (e) {
                console.error('[ZXing] unexpected error in callback', e);
              }
            });
      } catch (e) {
        console.debug('[ZXing] device enumeration failed', e);
            // fallback to default behavior
            // @ts-ignore
            reader.decodeFromVideoDevice(undefined, videoRef.current!, (result: any, err: any) => {
              try {
                if (mySession !== scanSessionRef.current) return;
                if (err) {
                  const name = err?.name || (err && String(err).split(':')[0]);
                  // other decode/frame errors

                  // Try single-shot capture on checksum errors (same logic as above)
                  try {
                    const isChecksum = /ChecksumException/i.test(String(name || err));
                    const now = Date.now();
                    if (isChecksum && (!lastCaptureAttemptRef.current || now - lastCaptureAttemptRef.current > 1200)) {
                      lastCaptureAttemptRef.current = now;
                      (async () => {
                        try {
                          const v = videoRef.current;
                          if (!v) return;
                          const canvas = document.createElement('canvas');
                          const scale = 2;
                          const w = v.videoWidth || 640;
                          const h = v.videoHeight || 480;
                          canvas.width = Math.max(320, Math.floor(w * scale));
                          canvas.height = Math.max(240, Math.floor(h * scale));
                          const ctx = canvas.getContext('2d');
                          if (!ctx) return;
                          ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
                          // @ts-ignore
                          if (typeof reader.decodeFromCanvas === 'function') {
                            try {
                              const single = await reader.decodeFromCanvas(canvas);
                              if (single && single.getText) {
                                const txt = single.getText();
                                // single-shot decoded text
                                setLastDecoded(String(txt));
                                Promise.resolve().then(() => handleScannedValue(String(txt))).catch(() => {});
                                return;
                              }
                              } catch (se) {
                                // single-shot decode failed
                              }
                          }
                        } catch (inner) {
                          // single-shot capture error suppressed
                        }
                      })();
                    }
                  } catch (xx) {
                    // ignore
                  }
                }
                if (result && result.getText) {
                  if (scannedRef.current) return;
                  scannedRef.current = true;
                  const text = result.getText();
                  // decoded text received
                  setLastDecoded(String(text));
                  try { if (readerRef.current) { try { readerRef.current.reset(); } catch {} } } catch {}
                  stopScanner();
                  Promise.resolve().then(() => handleScannedValue(String(text))).catch(() => {});
                }
              } catch (e2) {
                // unexpected error in callback suppressed
              }
            });
          }
            } catch (e) {
          console.warn('ZXing import failed', e);
          setScanError('No decoder available in this browser.');
          setScanning(false);
        }
      }
    } catch (err: any) {
      console.error('Camera error', err);
      setScanError(String(err?.message || err));
      setScanning(false);
    }
  }

  function stopScanner() {
    setScanning(false);
    // invalidate any in-flight callbacks for the current session
    try { scanSessionRef.current = (scanSessionRef.current || 0) + 1; } catch {}
    if (pollingIdRef.current) {
      clearInterval(pollingIdRef.current);
      pollingIdRef.current = null;
    }
    if (detectorRef.current) detectorRef.current = null;
    if (readerRef.current) {
      try { readerRef.current.reset(); } catch {}
      readerRef.current = null;
    }
    if (videoRef.current) {
      try { videoRef.current.pause(); } catch {}
      // @ts-ignore
      videoRef.current.srcObject = null;
    }
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop();
      streamRef.current = null;
    }
  }

  function pollDetect() {
    const interval = 500;
    // If native BarcodeDetector available, use interval-based detection
    if (detectorRef.current) {
      const id = setInterval(async () => {
        if (!videoRef.current) return;
        try {
          // @ts-ignore
          const barcodes = await detectorRef.current.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            const bc = barcodes[0];
            const raw = bc.rawValue || bc.displayValue;
            if (raw) {
              setLastDecoded(String(raw));
              handleScannedValue(String(raw));
            }
          }
        } catch (e) {
          console.error('Detect error', e);
        }
      }, interval);
      // @ts-ignore
      pollingIdRef.current = id as unknown as number;
      return;
    }

    // No jsQR fallback here; ZXing handles decoding via its own loop
    setScanError('No decoder available in this browser');
    return;
  }

  

  async function handleScannedValue(raw: string) {
    // Attempt to parse URL and extract item id from path /dashboard/items/:id
    let url: URL | null = null;
    try {
      if (raw.startsWith('/')) {
        url = new URL(raw, window.location.origin);
      } else {
        url = new URL(raw);
      }
    } catch (e) {
      setScanError('Scanned QR code is not a valid URL');
      stopScanner();
      return;
    }

    const m = url.pathname.match(/^\/dashboard\/items\/([^\/]+)\/?.*$/);
    if (!m) {
      setScanError('QR code does not point to an item page');
      stopScanner();
      return;
    }

    const itemId = m[1];
    try {
      const res = await fetch(`/api/items/${encodeURIComponent(itemId)}`);
      if (!res.ok) {
        setScanError('Item not found');
        stopScanner();
        return;
      }
      const item = await res.json();
      // Add to cart using addToCart
      addToCart({ id: item.id, name: item.name, price: Number(item.listPrice ?? item.transactionPrice ?? 0), quantity: 1 });
      setCart(getCart());
      setMessage('Item added to cart');
      setTimeout(() => setMessage(null), 4000);
    } catch (e) {
      console.error('Fetch item error', e);
      setScanError('Failed to fetch item');
    } finally {
      stopScanner();
    }
  }

  return (
    <main className={[styles.sometypeMono, "p-6"].join(" ")}>
      <h1 className="text-2xl font-semibold mb-4">Cart</h1>

      {cart.length === 0 ? (
        <div>
          <p>Your cart is empty.</p>
          <div className="mt-3 pt-4 border-t">
            <button onClick={() => startScanner()} className="px-4 py-2 rounded bg-gray-800 text-white hover:bg-gray-700">Scan QR Code</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <ul>
            {cart.map((it) => (
              <li key={it.id} className="flex items-center justify-between py-2 border-b">
                <div>
                  <div className="font-medium">{it.name}</div>
                  <div className="text-sm text-gray-600">${(it.price || 0).toFixed(2)} x {it.quantity || 1}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleRemove(it.id)} className="px-3 py-1 rounded border hover:bg-gray-100">Remove</button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <button onClick={() => startScanner()} className="px-4 py-2 rounded bg-gray-800 text-white hover:bg-gray-700">Scan QR Code</button>
          </div>
          
          <div className="mt-4 space-y-3 text-right">
            <div className="flex items-center gap-3 justify-end">
              <label className="text-sm font-medium">Store credit to apply:</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={String(storeCredit || '')}
                onChange={(e) => setStoreCredit(Number(e.target.value || 0))}
                className="w-32 rounded-md border px-2 py-1"
              />
            </div>

            <div className="flex justify-between flex-col">
              {storeCredit > 0 ? (
                <>
                    <div className="text-lg font-semibold">Sub-total: ${total.toFixed(2)}</div>  
                    <div className="text-lg font-semibold">Store credit amount: ${storeCredit.toFixed(2)}</div>  
                    <div className="text-lg font-semibold">Total: ${totalAfterCredit.toFixed(2)}</div>
                </>
              ) : (
                <div className="text-lg font-semibold">Total: ${total.toFixed(2)}</div>
              )}
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => { clearCart(); setCart([]); }} className="px-3 py-1 rounded border hover:bg-gray-100">Clear</button>
              <button onClick={handleCheckout} disabled={loading} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500">
                {loading ? 'Processing…' : 'Checkout'}
              </button>
            </div>
          </div>
          {message && <div className="mt-2 text-sm text-green-600">{message}</div>}
        </div>
      )}
      {waiting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-md p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-2">Waiting for payment</h2>
            <p className="text-sm text-gray-700 mb-4">Please complete the payment on the Square Terminal device.</p>
            <div className="text-sm text-gray-600 break-words mb-4">Checkout id: <span className="font-mono">{waitingCheckoutId}</span></div>
            {waitingError && <div className="text-sm text-red-600 mb-3">{waitingError}</div>}
            <div className="flex justify-end gap-2">
              <button onClick={cancelWaiting} className="px-3 py-1 rounded border hover:bg-gray-100">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {scanning && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-md p-4 w-full max-w-md">
            <h3 className="font-semibold mb-2">Scan QR Code</h3>
            <div className="mb-2">
              <video ref={videoRef} className="w-full h-64 object-cover bg-black" playsInline autoPlay muted />
            </div>
            {scanError && <div className="text-sm text-red-600 mb-2">{scanError}</div>}
            {/* diagnostics removed for production */}
            <div className="flex justify-end items-center">
              <button onClick={() => { stopScanner(); }} className="px-3 py-1 rounded border">Close</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
