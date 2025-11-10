"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function DateRangePicker() {
  const router = useRouter();
  const params = useSearchParams();

  const start = params.get("start") ?? "";
  const end = params.get("end") ?? "";

  return (
    <div className="flex gap-2 items-center mb-4">
      <input
        type="date"
        value={start}
        onChange={(e) => {
          const newStart = e.target.value;
          router.push(`?start=${newStart}&end=${end}`);
        }}
        className="border p-1 rounded"
      />

      <input
        type="date"
        value={end}
        onChange={(e) => {
          const newEnd = e.target.value;
          router.push(`?start=${start}&end=${newEnd}`);
        }}
        className="border p-1 rounded"
      />
    </div>
  );
}
