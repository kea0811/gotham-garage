import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isValidUpc,
  normalizeItem,
  lookupUpc,
  RATE_LIMIT_MESSAGE,
} from '@/lib/upcitemdb';

const VALID_UPC = '027084123456';

function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
}

function okBody(overrides: Record<string, unknown> = {}) {
  return {
    code: 'OK',
    items: [
      {
        title: 'Diecast 2024 Showroom Camaro Concept',
        brand: 'SomeBrand',
        description: 'A 1:64 diecast car',
        images: ['https://example.com/a.jpg'],
        category: 'Toys & Games > Toys',
        ...overrides,
      },
    ],
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('isValidUpc', () => {
  it('accepts 12-digit UPC-A', () => {
    expect(isValidUpc('027084123456')).toBe(true);
  });
  it('accepts 13-digit EAN-13', () => {
    expect(isValidUpc('0027084123456')).toBe(true);
  });
  it('rejects wrong lengths and non-digits', () => {
    expect(isValidUpc('12345')).toBe(false);
    expect(isValidUpc('02708412345678')).toBe(false);
    expect(isValidUpc('02708412345a')).toBe(false);
    expect(isValidUpc('')).toBe(false);
  });
});

describe('normalizeItem', () => {
  it('keeps the relevant fields', () => {
    expect(
      normalizeItem({
        title: 'T',
        brand: 'B',
        description: 'D',
        images: ['https://x/1.jpg'],
        category: 'C',
      }),
    ).toEqual({
      title: 'T',
      brand: 'B',
      description: 'D',
      images: ['https://x/1.jpg'],
      category: 'C',
    });
  });

  it('defaults a missing title and drops empty optionals', () => {
    expect(normalizeItem({})).toEqual({
      title: 'Unknown item',
      brand: undefined,
      description: undefined,
      images: [],
      category: undefined,
    });
    expect(normalizeItem({ brand: '', description: '', category: '' }).brand).toBeUndefined();
  });

  it('filters non-string images and tolerates a non-array', () => {
    expect(
      normalizeItem({ images: ['https://x/1.jpg', 42, null] as unknown as string[] }).images,
    ).toEqual(['https://x/1.jpg']);
    expect(normalizeItem({ images: 'nope' as unknown as string[] }).images).toEqual([]);
  });
});

describe('lookupUpc', () => {
  it('rejects invalid UPCs without fetching', async () => {
    const fetchImpl = vi.fn();
    const result = await lookupUpc('not-a-upc', { fetchImpl: fetchImpl as typeof fetch });
    expect(result).toEqual({ status: 'error', message: 'UPC must be 12 or 13 digits.' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('returns ok with normalized data and remaining quota', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(okBody(), { headers: { 'X-RateLimit-Remaining': '42' } }),
    );
    const result = await lookupUpc(VALID_UPC, { fetchImpl: fetchImpl as typeof fetch });
    expect(result).toEqual({
      status: 'ok',
      data: {
        title: 'Diecast 2024 Showroom Camaro Concept',
        brand: 'SomeBrand',
        description: 'A 1:64 diecast car',
        images: ['https://example.com/a.jpg'],
        category: 'Toys & Games > Toys',
      },
      remaining: 42,
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${VALID_UPC}`,
      { headers: { Accept: 'application/json' } },
    );
  });

  it('returns remaining null when the header is absent', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(okBody()));
    const result = await lookupUpc(VALID_UPC, { fetchImpl: fetchImpl as typeof fetch });
    expect(result).toMatchObject({ status: 'ok', remaining: null });
  });

  it('returns remaining null when the header is not a number', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(okBody(), { headers: { 'X-RateLimit-Remaining': 'soon' } }),
    );
    const result = await lookupUpc(VALID_UPC, { fetchImpl: fetchImpl as typeof fetch });
    expect(result).toMatchObject({ status: 'ok', remaining: null });
  });

  it('honors a baseUrl override', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(okBody()));
    await lookupUpc(VALID_UPC, {
      fetchImpl: fetchImpl as typeof fetch,
      baseUrl: 'https://proxy.test/upc',
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      `https://proxy.test/upc/lookup?upc=${VALID_UPC}`,
      expect.anything(),
    );
  });

  it('honors the UPCITEMDB_BASE env var', async () => {
    vi.stubEnv('UPCITEMDB_BASE', 'https://env.test/base');
    const fetchImpl = vi.fn(async () => jsonResponse(okBody()));
    await lookupUpc(VALID_UPC, { fetchImpl: fetchImpl as typeof fetch });
    expect(fetchImpl).toHaveBeenCalledWith(
      `https://env.test/base/lookup?upc=${VALID_UPC}`,
      expect.anything(),
    );
  });

  it('uses global fetch by default', async () => {
    const globalFetch = vi.fn(async () => jsonResponse(okBody()));
    vi.stubGlobal('fetch', globalFetch);
    const result = await lookupUpc(VALID_UPC);
    expect(result.status).toBe('ok');
    expect(globalFetch).toHaveBeenCalledOnce();
  });

  it('maps 404 to not_found', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, { status: 404 }));
    expect(await lookupUpc(VALID_UPC, { fetchImpl: fetchImpl as typeof fetch })).toEqual({
      status: 'not_found',
    });
  });

  it('maps 429 to rate_limited with the PRD copy', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, { status: 429 }));
    expect(await lookupUpc(VALID_UPC, { fetchImpl: fetchImpl as typeof fetch })).toEqual({
      status: 'rate_limited',
      message: RATE_LIMIT_MESSAGE,
    });
  });

  it('maps 5xx to rate_limited too', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, { status: 503 }));
    expect(await lookupUpc(VALID_UPC, { fetchImpl: fetchImpl as typeof fetch })).toMatchObject({
      status: 'rate_limited',
    });
  });

  it('maps other non-OK statuses to error', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, { status: 400 }));
    expect(await lookupUpc(VALID_UPC, { fetchImpl: fetchImpl as typeof fetch })).toEqual({
      status: 'error',
      message: 'UPC lookup failed (HTTP 400).',
    });
  });

  it('maps network failures to error', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('offline');
    });
    expect(await lookupUpc(VALID_UPC, { fetchImpl: fetchImpl as typeof fetch })).toEqual({
      status: 'error',
      message: 'Could not reach the UPC lookup service.',
    });
  });

  it('maps unparseable JSON to error', async () => {
    const fetchImpl = vi.fn(
      async () => new Response('not json', { status: 200, headers: { 'Content-Type': 'text/plain' } }),
    );
    expect(await lookupUpc(VALID_UPC, { fetchImpl: fetchImpl as typeof fetch })).toEqual({
      status: 'error',
      message: 'UPC lookup returned an unreadable response.',
    });
  });

  it('treats a non-OK code as not_found', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ code: 'INVALID_UPC', items: [] }));
    expect(await lookupUpc(VALID_UPC, { fetchImpl: fetchImpl as typeof fetch })).toEqual({
      status: 'not_found',
    });
  });

  it('treats an empty items array as not_found', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ code: 'OK', items: [] }));
    expect(await lookupUpc(VALID_UPC, { fetchImpl: fetchImpl as typeof fetch })).toEqual({
      status: 'not_found',
    });
  });

  it('treats a missing items field as not_found', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ code: 'OK' }));
    expect(await lookupUpc(VALID_UPC, { fetchImpl: fetchImpl as typeof fetch })).toEqual({
      status: 'not_found',
    });
  });
});
