import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Pitstop — diecast collection',
    short_name: 'Pitstop',
    description:
      'Phone-first catalog for diecast collectors. Scan barcodes, match loose cars by photo, browse offline.',
    start_url: '/collection',
    display: 'standalone',
    background_color: '#07070c',
    theme_color: '#07070c',
    orientation: 'portrait',
    categories: ['lifestyle', 'utilities'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
