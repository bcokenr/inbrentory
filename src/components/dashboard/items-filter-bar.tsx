"use client";

import { useRouter, useSearchParams } from 'next/navigation';

export default function ItemsFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get('filter') ?? '';

  function apply(filter: string) {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (filter) params.set('filter', filter); else params.delete('filter');
    params.delete('page');
    router.push(`/dashboard/items?${params.toString()}`);
  }

  return (
    <>
      <div className="mb-4 flex items-center gap-3 rounded bg-white p-3 shadow-sm">
        <div className="flex gap-2">
          <button onClick={() => apply('')} className={`px-3 py-1 rounded ${current === '' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>All</button>
          <button onClick={() => apply('sold')} className={`px-3 py-1 rounded ${current === 'sold' || current.startsWith('sold-') ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Sold</button>
          <button onClick={() => apply('unsold')} className={`px-3 py-1 rounded ${current === 'unsold' || current.startsWith('unsold-') ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Unsold</button>
        </div>

        <div className="ml-auto">
          <button className="rounded bg-gray-200 px-3 py-1" onClick={() => apply('')}>Clear</button>
        </div>
      </div>

      {/* Secondary sold filters: only show when Sold is active (or a sold-* refinement is active) */}
      {(current === 'sold' || current.startsWith('sold-')) && (
        <div className="mb-4 flex items-center gap-2 rounded bg-white p-3 shadow-sm">
          <div className="flex gap-2">
            <button
              onClick={() => apply('sold')}
              className={`px-2 py-0.5 text-sm rounded border ${current === 'sold' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
            >
              All sold
            </button>
            <button
              onClick={() => apply('sold-store')}
              className={`px-2 py-0.5 text-sm rounded border ${current === 'sold-store' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
            >
              Sold in store
            </button>
            <button
              onClick={() => apply('sold-depop')}
              className={`px-2 py-0.5 text-sm rounded border ${current === 'sold-depop' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
            >
              Sold on Depop
            </button>
          </div>
        </div>
      )}
      {/* Secondary unsold filters: only show when Unsold is active (or an unsold-* refinement is active) */}
      {(current === 'unsold' || current.startsWith('unsold-')) && (
        <div className="mb-4 flex items-center gap-2 rounded bg-white p-3 shadow-sm">
          <div className="flex gap-2">
            <button
              onClick={() => apply('unsold')}
              className={`px-2 py-0.5 text-sm rounded border ${current === 'unsold' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
            >
              All unsold
            </button>
            <button
              onClick={() => apply('unsold-depop')}
              className={`px-2 py-0.5 text-sm rounded border ${current === 'unsold-depop' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
            >
              Unsold on Depop
            </button>
          </div>
        </div>
      )}
    </>
  );
}
