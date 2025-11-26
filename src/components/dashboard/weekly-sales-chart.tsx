"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { parseISO, format } from 'date-fns';
import styles from '@/styles/home.module.css';
import { DEFAULT_TZ } from '@/config/timezone';

type WeeklyRow = {
  date: string; // sunday YYYY-MM-DD
  storeTotal: number;
  depopTotal: number;
  total: number;
};

type Props = {
  initialData: WeeklyRow[];
  initialYear: number;
  initialMonth: number; // 1-12
};

export function WeeklySalesChart({ initialData, initialYear, initialMonth }: Props) {
  const [data, setData] = useState<WeeklyRow[]>(initialData);
  const [year, setYear] = useState<number>(initialYear);
  const [month, setMonth] = useState<number>(initialMonth);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    setData(initialData);
    setYear(initialYear);
    setMonth(initialMonth);
  }, [initialData, initialYear, initialMonth]);

  function navigateTo(yearN: number, monthN: number) {
    const sp = new URLSearchParams(searchParams?.toString() || '');
    sp.set('month', String(monthN));
    sp.set('year', String(yearN));
    router.push(`${pathname}?${sp.toString()}`);
  }

  function prevMonth() {
    const dt = new Date(year, month - 1, 1);
    dt.setMonth(dt.getMonth() - 1);
    navigateTo(dt.getFullYear(), dt.getMonth() + 1);
  }

  function nextMonth() {
    const dt = new Date(year, month - 1, 1);
    dt.setMonth(dt.getMonth() + 1);
    navigateTo(dt.getFullYear(), dt.getMonth() + 1);
  }

  const tickFormatter = (date: string | number) => {
    try {
      const d = parseISO(String(date));
      const label = format(d, 'MMM d');
      const entry = data.find((x) => x.date === String(date));
      const total = entry ? entry.total : 0;
      return `${label} $${total}`;
    } catch (e) {
      return String(date);
    }
  };

  // Recharts XAxis renders ticks as SVG <text>. A literal `\n` in the string
  // won't create a new line. To render multi-line tick labels you need to
  // supply a custom tick renderer that returns <tspan> elements for each line.
  const CustomTick = (props: any) => {
    const { x, y, payload } = props;
    const value = String(payload?.value ?? '');
    // derive the two lines: date label and total
    let line1 = value;
    let line2 = '';
    try {
      const d = parseISO(value);
      line1 = format(d, 'MMM d');
      const entry = data.find((x) => x.date === value);
      const total = entry ? entry.total : 0;
      line2 = `$${total}`;
    } catch (e) {
      // fallback: show value only
    }
    // Increase font sizes for better readability and adjust spacing.
    // Use hanging baseline so the tick block starts below the axis line
    // and doesn't overlap the chart area above it.
    return (
      <text x={x} y={y} textAnchor="middle" fontSize={16} className={styles.sometypeMono} dominantBaseline="hanging">
        <tspan x={x} dy={0}>{line1}</tspan>
        <tspan x={x} dy={20}>{line2}</tspan>
      </text>
    );
  };

  function WeeklyTooltip({ active, label, payload }: any) {
    if (!active || !payload || payload.length === 0) return null;
    const store = payload.find((p: any) => p.dataKey === 'storeTotal')?.value ?? 0;
    const depop = payload.find((p: any) => p.dataKey === 'depopTotal')?.value ?? 0;
    const total = +(Number(store) + Number(depop)).toFixed(2);
    let title = String(label);
    try {
      title = format(parseISO(String(label)), 'MMMM d, yyyy');
    } catch (e) {}
    return (
      <div className={[styles.sometypeMono, 'bg-white p-4 rounded shadow'].join(' ')}>
        <div className="font-semibold text-xl">Week ending {title}</div>
        <div className="text-lg mt-1">In-store: ${store.toFixed(2)}</div>
        <div className="text-lg">Depop: ${depop.toFixed(2)}</div>
        <div className="border-t mt-2 pt-2 font-medium text-lg">Total: ${total.toFixed(2)}</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-center mb-2">
        <div className="flex gap-2 items-center">
          <button
            type="button"
            aria-label="Previous month"
            onClick={prevMonth}
            className="p-2 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
          >
            <ChevronLeftIcon className="h-5 w-5 text-gray-700" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={nextMonth}
            className="p-2 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
          >
            <ChevronRightIcon className="h-5 w-5 text-gray-700" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="w-full h-64 mb-4">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={CustomTick} />
            <YAxis />
            <Tooltip content={<WeeklyTooltip />} />

            <Bar dataKey="storeTotal" stackId="a" fill="#34D399" name="In-store" />
            <Bar dataKey="depopTotal" stackId="a" fill="#059669" name="Depop" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className={[styles.sometypeMono, 'text-center mt-6 font-semibold text-lg'].join(' ')}>
        {new Date(year, month - 1, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' })}
      </div>
    </div>
  );
}
