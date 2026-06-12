/**
 * Coarse device detection from the User-Agent, used at SSR so the phone-first
 * login can render the right surface on the FIRST paint (no client-side swap /
 * layout shift). The client later refines this with matchMedia for edge cases
 * (touch laptops, narrow desktop windows, iPadOS spoofing macOS).
 */
const MOBILE_UA =
  /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Silk/i;
// iPadOS Safari reports as "Macintosh"; treat explicit tablets as non-desktop too.
const TABLET_UA = /iPad|Tablet|PlayBook|Kindle/i;

export function isDesktopUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return false; // unknown → assume phone (the app's primary target)
  if (TABLET_UA.test(ua)) return false;
  return !MOBILE_UA.test(ua);
}
