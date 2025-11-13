"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function TransactionFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // empty string means "all" (no filter)
  const currentFilter = searchParams.get('filter') ?? '';
  const startParam = searchParams.get('start') || '';
  const endParam = searchParams.get('end') || '';
  const dayParam = searchParams.get('day') || '';

  const [filter, setFilter] = useState(currentFilter);
  const [start, setStart] = useState(startParam);
  const [end, setEnd] = useState(endParam);
  const [day, setDay] = useState(dayParam);

  useEffect(() => {
    setFilter(searchParams.get('filter') ?? '');
  setStart(searchParams.get('start') || '');
  setEnd(searchParams.get('end') || '');
  setDay(searchParams.get('day') || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams?.toString()]);

  function applyFilter(next: { filter?: string; start?: string; end?: string; day?: string }) {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (next.filter) {
      params.set('filter', next.filter);
    } else if (next.filter === '') {
      params.delete('filter');
    }
    if (next.start !== undefined) {
      if (next.start) params.set('start', next.start); else params.delete('start');
    }
    if (next.end !== undefined) {
      if (next.end) params.set('end', next.end); else params.delete('end');
    }
    if (next.day !== undefined) {
      if (next.day) params.set('day', next.day); else params.delete('day');
    }
    params.delete('page');
    router.push(`/dashboard/transactions?${params.toString()}`);
  }

  return (
    <div className="mb-4 flex items-center gap-3 rounded bg-white p-3 shadow-sm">
      <div className="flex gap-2">
        <button
          className={`px-3 py-1 rounded ${filter === 'today' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          onClick={() => applyFilter({ filter: 'today' })}
        >
          Today
        </button>
        <button
          className={`px-3 py-1 rounded ${filter === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          onClick={() => applyFilter({ filter: 'week' })}
        >
          This Week
        </button>
        <button
          className={`px-3 py-1 rounded ${filter === 'range' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          onClick={() => setFilter('range')}
        >
          By Date
        </button>
      </div>

      {/* Weekday sub-filter when week is active */}
      {filter === 'week' && (
        <div className="ml-4 flex gap-2">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((label, idx) => {
            // compute ISO date for the weekday relative to this week's Monday
            const monday = (() => {
              const now = new Date();
              const dayOfWeek = (now.getDay() + 6) % 7; // 0 = Monday
              const diff = -dayOfWeek; // days to subtract to get Monday
              const d = new Date(now);
              d.setDate(now.getDate() + diff + idx);
              return d;
            })();
            const iso = monday.toISOString().slice(0,10);
            return (
              <button
                key={label}
                className={`px-2 py-1 rounded ${day === iso ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}
                onClick={() => { setDay(iso); applyFilter({ filter: 'week', day: iso }); }}
              >
                {label}
              </button>
            );
          })}
          <button className="ml-2 rounded bg-gray-200 px-3 py-1" onClick={() => { setDay(''); applyFilter({ filter: 'week', day: '' }); }}>Clear Day</button>
        </div>
      )}

      {filter === 'range' && (
        <div className="ml-4 flex items-center gap-2">
          <input value={start} onChange={(e) => setStart(e.target.value)} type="date" className="rounded border px-2 py-1" />
          <span className="text-gray-400">to</span>
          <input value={end} onChange={(e) => setEnd(e.target.value)} type="date" className="rounded border px-2 py-1" />
          <button
            className="ml-2 rounded bg-green-600 px-3 py-1 text-white"
            onClick={() => {
              applyFilter({ filter: 'range', start: start || '', end: end || '' });
            }}
          >
            Apply
          </button>
          <button
            className="ml-2 rounded bg-gray-200 px-3 py-1"
            onClick={() => {
              setStart('');
              setEnd('');
              applyFilter({ filter: '', start: '', end: '' });
            }}
          >
            Clear
          </button>
        </div>
      )}

      {filter !== 'range' && (
        <div className="ml-auto">
          <button className="rounded bg-gray-200 px-3 py-1" onClick={() => { setStart(''); setEnd(''); applyFilter({ filter: '' , start: '', end: '' }); }}>Clear</button>
        </div>
      )}
    </div>
  );
}
