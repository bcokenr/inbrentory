"use client";

import React, { useEffect, useState } from 'react';
import { getCart, removeFromCart, clearCart, type CartItem } from '@/lib/cart';
import { useRouter } from 'next/navigation';
import styles from '@/styles/home.module.css';

export default function CartPageClient() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [storeCredit, setStoreCredit] = useState<number>(0);
  const router = useRouter();

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
      const res = await fetch('/api/transactions/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: cart.map((c) => c.id), storeCreditAmount: storeCredit }),
      });

      const body = await res.json();
      if (!res.ok) {
        setMessage(body?.error || 'Failed to process transaction');
        setLoading(false);
        return;
      }

  // success: clear client cart and navigate to cart (or success)
      clearCart();
      setCart([]);
      setMessage('Transaction completed');
      router.push('/dashboard/items');
    } catch (e) {
      console.error(e);
      setMessage('Failed to process transaction');
    } finally {
      setLoading(false);
    }
  }

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
    </main>
  );
}
