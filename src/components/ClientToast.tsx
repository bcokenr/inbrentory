"use client";

import React, { useEffect, useState } from 'react';

export default function ClientToast() {
  const [message, setMessage] = useState<string | null>(null);
  const [variant, setVariant] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('inbrentory:message');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.message) return;
      setMessage(parsed.message);
      setVariant(parsed.variant || 'success');
      // clear so it doesn't show again
      localStorage.removeItem('inbrentory:message');
      const t = setTimeout(() => {
        setMessage(null);
        setVariant(null);
      }, 5000);
      return () => clearTimeout(t);
    } catch (e) {
      // ignore
    }
  }, []);

  if (!message) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className={`px-4 py-2 rounded shadow-md text-sm font-medium ${variant === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
        {message}
      </div>
    </div>
  );
}
