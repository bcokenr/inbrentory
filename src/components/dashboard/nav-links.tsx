 'use client';

import {
  HomeIcon,
  DocumentDuplicateIcon,
  PrinterIcon,
  ShoppingCartIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { getCart } from '@/lib/cart';

// Map of links to display in the side navigation.
// Depending on the size of the application, this would be stored in a database.
const links = [
  { name: 'Home', href: '/dashboard', icon: HomeIcon },
  {
    name: 'Items',
    href: '/dashboard/items',
    icon: DocumentDuplicateIcon,
  },
    {
    name: 'Print',
    href: '/dashboard/print',
    icon: PrinterIcon,
  },
  {
    name: 'Cart',
    href: '/dashboard/cart',
    icon: ShoppingCartIcon,
  }
];

export default function NavLinks() {
  const pathname = usePathname();
  const [count, setCount] = useState<number>(() => {
    // initialize to 0; we'll populate after hydration to avoid SSR mismatch
    return 0;
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    function updateCountFromStorage() {
      try {
        setCount(getCart().reduce((s, c) => s + (c.quantity || 1), 0));
      } catch (err) {
        setCount(0);
      }
    }

    function onStorage(e: StorageEvent) {
      // if cart key changed (or cleared), update
      if (!e.key || e.key === 'inbrentory_cart_v1') {
        updateCountFromStorage();
      }
    }

    function onCustom() {
      updateCountFromStorage();
    }

    // populate count after hydration to avoid server/client mismatch
    updateCountFromStorage();
    setMounted(true);

    // listen for cross-tab storage events
    window.addEventListener('storage', onStorage);
    // listen for in-tab custom events emitted by cart helper
    window.addEventListener('inbrentory:cart-updated', onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('inbrentory:cart-updated', onCustom);
    };
  }, []);
  return (
    <>
      {links.map((link) => {
        const LinkIcon = link.icon;
        return (
          <Link
            key={link.name}
            href={link.href}
            className={clsx(
              'flex h-[48px] grow items-center justify-center gap-2 rounded-md bg-gray-50 p-3 text-sm font-medium hover:bg-green-100 hover:text-green-600 md:flex-none md:justify-start md:p-2 md:px-3',
              {
                'bg-green-100 text-green-600': pathname === link.href,
              },
            )}
          >
            <LinkIcon className="w-6" />
            {link.name === 'Cart' ? (
              <p className="hidden md:block">
                {link.name} {mounted ? <span className="text-sm">({count})</span> : null}
              </p>
            ) : (
              <p className="hidden md:block">{link.name}</p>
            )}
          </Link>
        );
      })}
    </>
  );
}
