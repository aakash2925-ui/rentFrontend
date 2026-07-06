import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import { CartProvider } from "@/context/CartContext";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import SiteAnalyticsTracker from "@/components/analytics/SiteAnalyticsTracker";
import { siteDescription, siteKeywords, siteLogo, siteName, siteUrl, socialProfiles } from "@/lib/siteMetadata";

export const metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: siteName,
    template: `%s | ${siteName}`
  },
  description: siteDescription,
  keywords: siteKeywords,
  authors: [{ name: siteName, url: siteUrl }],
  creator: siteName,
  publisher: siteName,
  category: "shopping",
  appleWebApp: {
    title: siteName,
    capable: true,
    statusBarStyle: "black-translucent"
  },
  other: {
    "application-name": siteName,
    "apple-mobile-web-app-title": siteName,
    "msapplication-TileImage": "/zasoota-logo.svg",
    "msapplication-TileColor": "#573875"
  },
  alternates: {
    canonical: "/"
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/zasoota-logo.svg", type: "image/svg+xml" }
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg"
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteUrl,
    siteName,
    title: siteName,
    description: siteDescription,
    images: [
      {
        url: siteLogo,
        width: 1500,
        height: 1500,
        alt: `${siteName} logo`
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDescription,
    images: [siteLogo]
  }
};

export default function RootLayout({ children }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: siteName,
        url: siteUrl,
        logo: {
          "@type": "ImageObject",
          url: siteLogo,
          width: 1500,
          height: 1500
        },
        sameAs: socialProfiles
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: siteName,
        alternateName: "Zasoota",
        url: siteUrl,
        publisher: {
          "@id": `${siteUrl}/#organization`
        },
        potentialAction: {
          "@type": "SearchAction",
          target: `${siteUrl}/items?search={search_term_string}`,
          "query-input": "required name=search_term_string"
        }
      }
    ]
  };

  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <CartProvider>
                <SiteAnalyticsTracker />
                <Navbar />
                <main className="min-h-screen">{children}</main>
                <Footer />
              </CartProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
