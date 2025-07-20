
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  metadataBase: new URL('https://fairdesk.example.com'),
  title: {
    default: 'FairDesk',
    template: '%s | FairDesk',
  },
  description: 'A fair, transparent, and intelligent seat rotation system for modern teams.',
  manifest: '/manifest.json',
  keywords: ['seat rotation', 'office management', 'hot desking', 'collaborative workspace', 'PWA'],
  authors: [{ name: 'Firebase Studio' }],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'FairDesk: Smart & Collaborative Seat Management',
    description: 'Automate and democratize office seating arrangements with a smart, fair, and transparent rotation system.',
    url: 'https://fairdesk.example.com',
    siteName: 'FairDesk',
    images: [
      {
        url: '/fairdesk-og.png', // This should be a 1200x630 image in the public folder
        width: 1200,
        height: 630,
        alt: 'FairDesk Application Banner',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FairDesk: Smart & Collaborative Seat Management',
    description: 'Automate and democratize office seating arrangements with a smart, fair, and transparent rotation system.',
    images: ['/fairdesk-og.png'], // This should be a 1200x630 image in the public folder
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
         <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased h-full bg-background">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
