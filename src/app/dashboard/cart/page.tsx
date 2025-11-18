"use client";

import React, { useEffect, useState, useRef } from 'react';
import { getCart, removeFromCart, clearCart, type CartItem } from '@/lib/cart';
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

  return (
    <main className={[styles.sometypeMono, "p-6"].join(" ")}>
      <h1 className="text-2xl font-semibold mb-4">Cart</h1>

      {cart.length === 0 ? (
        <p>Your cart is empty.</p>
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
    </main>
  );
}
