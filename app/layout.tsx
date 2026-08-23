import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

function metadataBase(): URL {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configured) {
    try {
      return new URL(configured);
    } catch {
      // Fall back to the local development URL below.
    }
  }

  return new URL("http://localhost:3000");
}

const description =
  "Upload an image, describe the changes you want, and edit with AI using precision masks, reference files, model presets, and transparent generation credits.";

export const metadata: Metadata = {
  metadataBase: metadataBase(),
  title: "Image's Banana – AI Image Editor",
  description,
  keywords: ["AI image editor", "image editing", "generative AI", "AI photo editor"],
  creator: "Image's Banana",
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Image's Banana",
    title: "Image's Banana – AI Image Editor",
    description,
    images: ["/og.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Image's Banana – AI Image Editor",
    description,
    images: ["/og.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  other: {
    "darkreader-lock": "true",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="dark"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-zinc-200`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
