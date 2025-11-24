"use client";

import React, { useEffect, useState, useRef } from 'react';
import { createItemForCartForm } from '@/lib/actions';
import { getCart, removeFromCart, clearCart, addToCart, type CartItem } from '@/lib/cart';
import { useRouter } from 'next/navigation';
import styles from '@/styles/home.module.css';

export default function CartPageClient() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageVariant, setMessageVariant] = useState<'success' | 'error' | null>(null);
  const [storeCredit, setStoreCredit] = useState<number>(0);
  const [waiting, setWaiting] = useState(false);
  const [waitingCheckoutId, setWaitingCheckoutId] = useState<string | null>(null);
  const [waitingError, setWaitingError] = useState<string | null>(null);
  const router = useRouter();
  const pollingIdRef = useRef<number | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState<string>('');
  const [addListPrice, setAddListPrice] = useState<string>('');
  const [addOnDepop, setAddOnDepop] = useState<boolean>(false);
  const [addCategory, setAddCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [adding, setAdding] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
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
    // mark cart as loaded so we don't flash empty-state UI during initial render
    setCartLoaded(true);
    // listen for cart helper messages (e.g., item already in cart)
    function onCartMessage(e: Event) {
      const detail = (e as CustomEvent)?.detail;
      if (!detail) return;
      setMessage(detail.message || null);
      setMessageVariant(detail.variant || 'error');
      setTimeout(() => {
        setMessage(null);
        setMessageVariant(null);
      }, 4000);
    }
    window.addEventListener('inbrentory:cart-message', onCartMessage as EventListener);
    return () => {
      window.removeEventListener('inbrentory:cart-message', onCartMessage as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!showAddModal) return;
    // fetch categories for select
    let mounted = true;
    fetch(`/api/categories`).then((r) => r.json()).then((body) => {
      if (!mounted) return;
      if (body?.categories && Array.isArray(body.categories)) {
        setCategories(body.categories.map((c: any) => ({ id: c.id, name: c.name })));
      }
    }).catch(() => { });
    return () => { mounted = false; };
  }, [showAddModal]);

  useEffect(() => {
    if (!showAddModal) return;
    // focus the name input once modal is open
    const t = setTimeout(() => {
      try {
        nameInputRef.current?.focus();
        nameInputRef.current?.select();
      } catch (e) { }
    }, 50);
    return () => clearTimeout(t);
  }, [showAddModal]);

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
        setMessageVariant('error');
        setLoading(false);
        return;
      }

      const checkoutId = body?.checkoutId;
      if (!checkoutId) {
        setMessage('No checkout id returned from Square');
        setMessageVariant('error');
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
      setMessageVariant('error');
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
            setMessageVariant('success');
            // auto-dismiss toast after 5s
            setTimeout(() => { setMessage(null); setMessageVariant(null); }, 5000);
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
      // Use BarcodeDetector if available
      if ((window as any).BarcodeDetector) {
        // Request camera access (prefer user camera) and request higher resolution
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } } });
        streamRef.current = stream;
        if (videoRef.current) {
          // ensure autoplay will be allowed: mute the element
          try {
            videoRef.current.muted = true;
          } catch { }
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
          } catch { }
        }

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
          try { if (readerRef.current) { await readerRef.current.reset?.(); } } catch { }
          // create reader and start decoding from the video element
          const reader = new BrowserQRCodeReader();
          readerRef.current = reader;
          setDecoderUsed('ZXing');
          try {
            // Request a user-facing stream and decode from the running video element so
            // browsers (including iPad Safari) are more likely to use the front camera.
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } } });
            streamRef.current = stream;
            if (videoRef.current) {
              try { videoRef.current.muted = true; } catch { }
              videoRef.current.srcObject = stream;
              await new Promise<void>((resolve) => {
                const v = videoRef.current!;
                if (v.readyState >= 2) return resolve();
                const onMeta = () => { v.removeEventListener('loadedmetadata', onMeta); resolve(); };
                v.addEventListener('loadedmetadata', onMeta);
              });
              await videoRef.current.play();
              try { const vid = videoRef.current!; setVideoSize({ w: vid.videoWidth || 0, h: vid.videoHeight || 0 }); } catch { }
            }

            // decode directly from the running video element
            // @ts-ignore
            reader.decodeFromVideoElement(videoRef.current!, (result: any, err: any) => {
              try {
                if (mySession !== scanSessionRef.current) return;
                if (err) {
                  const name = err?.name || (err && String(err).split(':')[0]);
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
                          ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
                          // @ts-ignore - some versions expose decodeFromCanvas
                          if (typeof reader.decodeFromCanvas === 'function') {
                            try {
                              const single = await reader.decodeFromCanvas(canvas);
                              if (single && single.getText) {
                                const txt = single.getText();
                                setLastDecoded(String(txt));
                                Promise.resolve().then(() => handleScannedValue(String(txt))).catch((e) => console.error('[ZXing] handleScannedValue error', e));
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
                  setLastDecoded(String(text));
                  try { if (readerRef.current) { try { readerRef.current.reset(); } catch { } } } catch { }
                  stopScanner();
                  Promise.resolve().then(() => handleScannedValue(String(text))).catch(() => { });
                }
              } catch (cbErr) {
                console.error('[ZXing] unexpected error in callback', cbErr);
              }
            });
          } catch (e) {
            // If requesting a front-facing stream failed, fall back to letting ZXing pick a device
            console.debug('[ZXing] getUserMedia decode-from-element failed, falling back', e);
            try {
              // @ts-ignore
              reader.decodeFromVideoDevice(undefined, videoRef.current!, (result: any, err: any) => {
                try {
                  if (mySession !== scanSessionRef.current) return;
                  if (err) {
                    const name = err?.name || (err && String(err).split(':')[0]);
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
                                  setLastDecoded(String(txt));
                                  Promise.resolve().then(() => handleScannedValue(String(txt))).catch(() => { });
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
                    } catch (xx) { }
                  }
                  if (result && result.getText) {
                    if (scannedRef.current) return;
                    scannedRef.current = true;
                    const text = result.getText();
                    setLastDecoded(String(text));
                    try { if (readerRef.current) { try { readerRef.current.reset(); } catch { } } } catch { }
                    stopScanner();
                    Promise.resolve().then(() => handleScannedValue(String(text))).catch(() => { });
                  }
                } catch (innerCbErr) {
                  // suppressed
                }
              });
            } catch (fallbackErr) {
              console.debug('[ZXing] fallback decode failed', fallbackErr);
              setScanError('No decoder available in this browser');
              setScanning(false);
            }
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

  async function stopScanner() {
    setScanning(false);
    // invalidate any in-flight callbacks for the current session
    try { scanSessionRef.current = (scanSessionRef.current || 0) + 1; } catch { }
    if (pollingIdRef.current) {
      clearInterval(pollingIdRef.current);
      pollingIdRef.current = null;
    }
    if (detectorRef.current) detectorRef.current = null;
    if (readerRef.current) {
      try { readerRef.current.reset(); } catch { }
      readerRef.current = null;
    }
    if (videoRef.current) {
      try { videoRef.current.pause(); } catch { }
      // @ts-ignore
      videoRef.current.srcObject = null;
    }
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop();
      streamRef.current = null;
    }

    // Aggressive fallback: stop any MediaStreamTracks still attached to video elements on the page.
    // This helps in cases where a decoder library created an internal stream that wasn't exposed via our refs.
    try {
      const videos = Array.from(document.querySelectorAll('video')) as HTMLVideoElement[];
      for (const v of videos) {
        try {
          const s = (v as any).srcObject as MediaStream | null;
          if (s && typeof s.getTracks === 'function') {
            for (const tr of s.getTracks()) {
              try { tr.stop(); } catch (e) { }
            }
          }
          try { v.srcObject = null; } catch (e) { }
        } catch (inner) {
          // ignore
        }
      }
    } catch (e) {
      // ignore
    }

    // Final aggressive fallback: if the camera still appears in-use, request a short-lived stream and stop it.
    // This will usually succeed silently if the user already granted permission and will forcibly free the device.
    try {
      if (navigator?.mediaDevices?.getUserMedia) {
        const testStream = await navigator.mediaDevices.getUserMedia({ video: true });
        try {
          for (const tr of testStream.getTracks()) {
            try { tr.stop(); } catch (e) { }
          }
        } catch (inner) { }
      }
    } catch (e) {
      // ignore - don't surface permission errors here
    }
  }

  function closeAddModal() {
    try {
      setAddName('');
      setAddListPrice('');
      setAddOnDepop(false);
      setAddCategory(null);
    } catch (e) { }
    setShowAddModal(false);
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
      // Add to cart using addToCart if not already purchased
      if (item.transaction) {
        setMessage('Item has already been purchased');
        setMessageVariant('error');
        stopScanner();
        return;
      }
      addToCart({ id: item.id, name: item.name, price: Number(item.listPrice ?? item.transactionPrice ?? 0), quantity: 1 });
      setCart(getCart());
      setMessage('Item added to cart');
      setMessageVariant('success');
      setTimeout(() => { setMessage(null); setMessageVariant(null); }, 4000);
    } catch (e) {
      console.error('Fetch item error', e);
      setScanError('Failed to fetch item');
    } finally {
      stopScanner();
    }
  }

  return (
    <main className={[styles.sometypeMono].join(" ")}>
      <h1 className="text-2xl font-semibold mb-4">Cart</h1>
      {!cartLoaded ? (
        <div className="mt-6 flex items-center gap-3">
          <svg className="h-6 w-6 animate-spin text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
          <div className="text-gray-700">Loading cart…</div>
        </div>
      ) : (
        <>
          <div className="lg:mt-12 mb-4">
            <div className="flex gap-3">
              <button onClick={() => startScanner()} className="px-4 py-2 rounded bg-gray-800 text-white hover:bg-gray-700">Scan QR Code</button>
              <button onClick={() => { setShowAddModal(true); }} className="px-4 py-2 rounded bg-gray-800 text-white hover:bg-gray-700 ml-4">Add Item Without QR Code</button>
            </div>
          </div>

          {cart.length === 0 ? (
            <div className="mt-8">
              <p>Your cart is empty.</p>
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
              {message && (
                <div className={`mt-2 text-sm ${messageVariant === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                  {message}
                </div>
              )}
            </div>
          )}
        </>
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

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-md p-4 w-full max-w-md">
            <h3 className="font-semibold mb-2">Add Item (without QR)</h3>
            <div className="space-y-3 mb-3">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input name="name" ref={nameInputRef} value={addName} onChange={(e) => setAddName(e.target.value)} className="w-full rounded-md border px-2 py-1" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Price (USD)</label>
                <input name="listPrice" type="number" step="0.01" value={addListPrice} onChange={(e) => setAddListPrice(e.target.value)} className="w-full rounded-md border px-2 py-1" />
              </div>
              <div className="flex items-center gap-3">
                <input id="add-on-depop" name="onDepop" type="checkbox" checked={addOnDepop} onChange={(e) => setAddOnDepop(e.target.checked)} />
                <label htmlFor="add-on-depop" className="text-sm">On Depop</label>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select name="categories" value={addCategory ?? ''} onChange={(e) => setAddCategory(e.target.value || null)} className="w-full rounded-md border px-2 py-1">
                  <option value="">(none)</option>
                  {categories.map((c) => (
                    <option value={c.name} key={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { closeAddModal(); }} className="px-3 py-1 rounded border">Cancel</button>
              <form onSubmit={async (e) => {
                e.preventDefault();
                // Build FormData from controlled inputs (inputs are outside the form element)
                const fd = new FormData();
                fd.append('name', String(addName || ''));
                fd.append('listPrice', String(addListPrice || '0'));
                if (addOnDepop) fd.append('onDepop', '1');
                if (addCategory) fd.append('categories', String(addCategory));
                setAdding(true);
                try {
                  // call server action
                  const item = await createItemForCartForm(fd);
                  if (item && item.id) {
                    addToCart({ id: item.id, name: item.name, price: Number(item.listPrice || 0), quantity: 1 });
                    setCart(getCart());
                    setMessage('Item added to cart');
                    setMessageVariant('success');
                    setTimeout(() => { setMessage(null); setMessageVariant(null); }, 4000);
                    // close modal after successful add and clear inputs
                    closeAddModal();
                  }
                } catch (err) {
                  console.error('create item (server action) error', err);
                  setMessage('Failed to create item');
                  setMessageVariant('error');
                } finally {
                  setAdding(false);
                }
              }}>
                <input type="hidden" name="_action" value="create" />
                <button type="submit" disabled={adding} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500">{adding ? 'Adding…' : 'Add to Cart'}</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
