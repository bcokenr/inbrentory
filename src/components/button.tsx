"use client";

import clsx from 'clsx';
import { PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { deleteItemAction, deleteImage, markItemSold, deleteTransactionAction } from '@/lib/actions';
import React, { useEffect, useRef, useState } from 'react';
import styles from '@/styles/home.module.css';
import { useRouter } from 'next/navigation';
import { addToCart, getCart, removeFromCart } from '@/lib/cart';
import type { Item } from '@/lib/definitions';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function Button({ children, className, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={clsx(
        'flex h-10 items-center rounded-lg bg-blue-500 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 active:bg-blue-600 aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function CreateItem() {
  return (
    <Link
      href="/dashboard/items/create"
      className="flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
    >
      <span className="hidden md:block">Create Item</span>{' '}
      <PlusIcon className="h-5 md:ml-4" />
    </Link>
  );
}

export function DeleteItem({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('keydown', onKey);
    } else {
      document.removeEventListener('keydown', onKey);
    }
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function handleClick(e: React.MouseEvent) {
    // open confirmation modal instead of submitting immediately
    e.preventDefault();
    setOpen(true);
    // focus will move to confirm button via effect when needed
  }

  function handleConfirm() {
    // submit the hidden form which is wired to the server action
    formRef.current?.requestSubmit();
  }

  return (
    <>
      <form
        action={deleteItemAction}
        ref={formRef}
        className="inline-block"
        // keep form visible in DOM for requestSubmit; submission will occur only on confirm
      >
        <input type="hidden" name="id" value={id} />
        <button
          type="button"
          onClick={handleClick}
          className="flex h-10 items-center rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
        >
          <TrashIcon className="h-5 md:mx-2" />
        </button>
      </form>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
        >
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold">Delete item</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete this item? This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                onClick={handleConfirm}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function UpdateItem({ id }: { id: string }) {
  return (
    <Link
      href={`/dashboard/items/${id}/edit`}
      className="rounded-md border p-2 hover:bg-gray-100"
    >
      <PencilIcon className="w-5" />
    </Link>
  );
}

export function DeleteTransaction({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('keydown', onKey);
    } else {
      document.removeEventListener('keydown', onKey);
    }
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    setOpen(true);
  }

  function handleConfirm() {
    formRef.current?.requestSubmit();
  }

  return (
    <>
      <form action={deleteTransactionAction} ref={formRef} className="inline-block">
        <input type="hidden" name="id" value={id} />
        <button
          type="button"
          onClick={handleClick}
          className="flex h-10 items-center rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
        >
          <TrashIcon className="h-5 md:mx-2" />
        </button>
      </form>

      {open && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative z-10 max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold">Delete transaction</h3>
            <p className="mt-2 text-sm text-gray-600">Are you sure you want to delete this transaction? This will unlink associated items but will not delete the items themselves.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200">Cancel</button>
              <button type="button" onClick={handleConfirm} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500">Confirm Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}



export function DeleteImageButton({
  itemId,
  imageUrl,
}: {
  itemId: string;
  imageUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function confirmDelete() {
    if (formRef.current) {
      formRef.current.requestSubmit(); // triggers the server action
    }
    setOpen(false);
  }

  return (
    <>
      {/* Hidden form that triggers server action */}
      <form
        ref={formRef}
        action={deleteImage}
      >
        <input type="hidden" name="itemId" value={itemId} />
        <input type="hidden" name="imageUrl" value={imageUrl} />
      </form>

      {/* X button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute top-1 right-1 bg-black/40 hover:bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
      >
        ✕
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-2">Delete Image?</h2>
            <p className="text-sm text-gray-600 mb-6">
              This action will permanently remove this image.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-100 text-sm"
              >
                Cancel
              </button>

              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function MarkSoldButton({ itemId }: { itemId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className="border px-3 py-1 rounded-md hover:bg-gray-100">
        Mark Sold
      </button>

      {open && (
        <div className={[styles.zOne, "fixed inset-0 bg-black/40 flex justify-center items-center"].join(" ")}>
          <form
            action={formData => {
              markItemSold(itemId, formData);
              setOpen(false);
            }}
            className="bg-white p-4 rounded w-80 space-y-3"
          >
            <div>
              <label>Transaction Price (required):</label>
              <input name="transactionPrice" type="number" step="0.01" required className="border w-full" />
            </div>

            <div>
              <label>Store Credit Applied:</label>
              <input name="storeCredit" type="number" step="0.01" className="border w-full" />
            </div>

            <div>
              <label>Cost Basis:</label>
              <input name="costBasis" type="number" step="0.01" className="border w-full" />
            </div>

            <div>
              <label>Sale Date:</label>
              <input
                name="saleDate"
                type="datetime-local"
                defaultValue={new Date().toISOString().slice(0,16)}
                className="border w-full"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <button type="button" onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" className="bg-blue-600 text-white px-3 py-1">Save</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

export function AddToCartButton({ item }: { item: Partial<Item> & { id: string; name: string } }) {
  const router = useRouter();
  // null = loading, true/false = loaded
  const [inCart, setInCart] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const cart = getCart();
      setInCart(cart.some((c) => c.id === item.id));
    } catch (e) {
      setInCart(false);
    }
  }, [item.id]);

  function handleAdd() {
    const price = Number(item.discountedListPrice ?? item.listPrice ?? 0);
    addToCart({ id: item.id, name: item.name, price });
    router.push('/dashboard/cart');
  }

  function handleRemove() {
    removeFromCart(item.id);
    setInCart(false);
  }

  // avoid flicker: don't render the button until we know whether the item is in cart
  if (inCart === null) {
    return <div style={{ width: 96, height: 40 }} />;
  }

  if (inCart) {
    return (
      <div className="flex items-center gap-2">
        <button onClick={() => router.push('/dashboard/cart')} className="rounded-md border px-3 py-1 hover:bg-gray-100">View Cart</button>
        <button onClick={handleRemove} className="rounded-md border px-3 py-1 hover:bg-gray-100">Remove</button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      className="rounded-md border px-3 py-1 hover:bg-gray-100"
    >
      Add to Cart
    </button>
  );
}