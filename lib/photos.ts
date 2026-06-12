'use client';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { isDemoMode } from '@/lib/demo/mode';

/** Read a Blob as a data URL (used for demo-mode local photo storage). */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error ?? new Error('Could not read image'));
    r.readAsDataURL(blob);
  });
}

/**
 * Client-direct photo uploads to Supabase Storage (no server hop). Photos are
 * compressed to ~1 MB client-side first (lib/image-compress.ts).
 *
 * Bucket: `photos` (private), path: `{userId}/{itemId}/{timestamp}.jpg`.
 * RLS limits authenticated users to their own `{userId}/` prefix — the SQL
 * policies are in the README. We store a long-lived signed URL on the Mongo
 * photo doc so private-bucket images render with a plain <img>.
 */

export const PHOTOS_BUCKET = 'photos';

/** ~10 years; effectively a capability URL for the private bucket. */
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365 * 10;

export const STORAGE_NOT_CONFIGURED_MESSAGE =
  "Photo storage not configured — create a 'photos' bucket in Supabase.";

export function photoPath(userId: string, itemId: string, timestamp: number = Date.now()): string {
  return `${userId}/${itemId}/${timestamp}.jpg`;
}

export interface UploadedPhoto {
  url: string;
  path: string;
}

/** Upload a compressed JPEG for a collection item; returns a renderable URL. */
export async function uploadItemPhoto(itemId: string, blob: Blob): Promise<UploadedPhoto> {
  // Demo mode: keep the photo entirely in the browser as a data URL — nothing
  // is uploaded. The item (with this inline URL) lives in the local store.
  if (isDemoMode()) {
    const url = await blobToDataUrl(blob);
    return { url, path: `demo/${itemId}` };
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error(STORAGE_NOT_CONFIGURED_MESSAGE);

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('Sign in again to upload photos.');

  const path = photoPath(userId, itemId);
  const storage = supabase.storage.from(PHOTOS_BUCKET);

  const { error: uploadError } = await storage.upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (uploadError) {
    if (/bucket not found/i.test(uploadError.message)) {
      throw new Error(STORAGE_NOT_CONFIGURED_MESSAGE);
    }
    throw new Error(`Photo upload failed: ${uploadError.message}`);
  }

  // Private bucket → signed URL. Fall back to the public URL pattern in case
  // the bucket was created public.
  const { data: signed } = await storage.createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (signed?.signedUrl) return { url: signed.signedUrl, path };
  const { data: pub } = storage.getPublicUrl(path);
  return { url: pub.publicUrl, path };
}
