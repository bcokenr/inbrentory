"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { parseISO, addDays, startOfWeek, endOfWeek, format } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { DEFAULT_TZ } from '@/config/timezone';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export function DateRangePicker() {
  const router = useRouter();
  const params = useSearchParams();

  const start = params.get("start") ?? "";
  const end = params.get("end") ?? "";

  const formatDate = (d: Date) => format(d, 'yyyy-MM-dd');

  const gotoWeekOffset = (weeks: number) => {
    let startDate: Date;
    let endDate: Date;

    // Interpret date-only params as wall-time dates in the configured timezone
    if (start) {
      // create a zoned Date representing local midnight in DEFAULT_TZ for the provided date string
      startDate = utcToZonedTime(zonedTimeToUtc(`${start}T00:00:00`, DEFAULT_TZ), DEFAULT_TZ);
    } else {
      startDate = startOfWeek(utcToZonedTime(new Date(), DEFAULT_TZ), { weekStartsOn: 1 });
    }

    if (end) {
      endDate = utcToZonedTime(zonedTimeToUtc(`${end}T00:00:00`, DEFAULT_TZ), DEFAULT_TZ);
    } else {
      endDate = endOfWeek(utcToZonedTime(new Date(), DEFAULT_TZ), { weekStartsOn: 1 });
    }

  const newStart = addDays(startDate, weeks * 7);
  const newEnd = addDays(endDate, weeks * 7);

  // Format using the zoned Date (format will render the correct yyyy-MM-dd for the zone)
  router.push(`?start=${format(newStart, 'yyyy-MM-dd')}&end=${format(newEnd, 'yyyy-MM-dd')}`);
  };

  return (
    <div className="flex items-center mb-4">
      <div className="flex gap-2 items-center">
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

      <div className="mx-auto flex gap-2">
        <button
          type="button"
          aria-label="Previous week"
          onClick={() => gotoWeekOffset(-1)}
          className="p-2 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
        >
          <ChevronLeftIcon className="h-5 w-5 text-gray-700" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Next week"
          onClick={() => gotoWeekOffset(1)}
          className="p-2 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
        >
          <ChevronRightIcon className="h-5 w-5 text-gray-700" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
