'use client';

import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import type { CollectionItemDTO } from '@/models/CollectionItem';

interface ListResponse {
  items: CollectionItemDTO[];
  hasMore: boolean;
}

const CSV_COLUMNS = [
  'name',
  'year',
  'series',
  'castingName',
  'color',
  'baseCode',
  'upc',
  'status',
  'source',
  'notes',
  'createdAt',
] as const;

function csvEscape(value: unknown): string {
  const s = value === undefined || value === null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(items: CollectionItemDTO[]): string {
  const rows = items.map((item) => CSV_COLUMNS.map((c) => csvEscape(item[c])).join(','));
  return [CSV_COLUMNS.join(','), ...rows].join('\n');
}

/** CSV export + sign out (Supabase). Sits in the thumb zone on /settings. */
export function SettingsActions() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function exportCsv() {
    setBusy('csv');
    setError(null);
    try {
      const items: CollectionItemDTO[] = [];
      for (let page = 1; page <= 50; page++) {
        const res = await fetch(`/api/collection?limit=200&page=${page}`);
        if (!res.ok) throw new Error('Could not load your collection.');
        const data = (await res.json()) as ListResponse;
        items.push(...data.items);
        if (!data.hasMore) break;
      }
      const blob = new Blob([toCsv(items)], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pitstop-collection-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setBusy(null);
    }
  }

  async function signOut() {
    setBusy('signout');
    const supabase = getSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    window.location.assign('/login');
  }

  return (
    <div className="mt-auto flex flex-col gap-3 pt-8">
      {error ? (
        <p className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button variant="panel" disabled={busy !== null} onClick={() => void exportCsv()}>
        {busy === 'csv' ? 'Exporting…' : 'Export collection as CSV'}
      </Button>
      <Button variant="danger" disabled={busy !== null} onClick={() => void signOut()}>
        {busy === 'signout' ? 'Signing out…' : 'Sign out'}
      </Button>
    </div>
  );
}
