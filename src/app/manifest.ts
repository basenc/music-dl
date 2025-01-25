import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MusicDL',
    short_name: 'MusicDL',
    description: 'A Progressive Web App built with Next.js',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0071A9',
    icons: [
      {
        src: '/icon-192x192',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}