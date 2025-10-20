"use client";

import { useEffect, useState } from "react";

type Item = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    fetch("/api/items")
      .then((res) => res.json())
      .then(setItems);
  }, []);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">InBrentory</h1>
      <ul>
        {items.map((item) => (
          <li key={item.id} className="mb-2 border-b pb-1">
            {item.name} - ${item.price} ({item.quantity})
          </li>
        ))}
      </ul>
    </main>
  );
}
