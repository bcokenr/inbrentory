// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { caveat, kalam, roboto, lato } from '@/lib/fonts';

export const metadata: Metadata = {
  title: 'InBrentory',
  description: 'Track and manage vintage store inventory',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${caveat.variable} ${kalam.variable} ${roboto.variable} ${lato.variable}`}>{children}</body>
    </html>
  );
}
