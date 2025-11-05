"use client";

import { QRCodeCanvas } from "qrcode.react";

export default function ItemQR({ url }: { url: string }) {
  return (
    <div className="p-2 bg-white rounded-lg shadow border border-gray-200 inline-block">
      <QRCodeCanvas value={url} size={50} />
    </div>
  );
}
