import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { Web3Provider } from "@/providers/Web3Provider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "KUB Node Info",
    template: "%s · KUB Node Info",
  },
  description:
    "Explore validators and node information on the KUB Chain — stake, delegation, rewards and commission, read live from the StakeManager smart contract.",
};

// Drives the browser/OS chrome colour per theme. `themeColor` in `metadata` is
// deprecated in this Next version — it must live on the `viewport` export.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0e12" },
  ],
};

// Runs synchronously during HTML parse, before first paint, so the saved theme
// is applied with no flash. Mirrors ThemeProvider's logic; key stays "theme".
const NO_FLASH_THEME = `(function(){try{var t=localStorage.getItem('theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${roboto.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME }} />
      </head>
      <body className="flex min-h-full flex-col text-ink">
        <ThemeProvider>
          <Web3Provider>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-40 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg"
            >
              Skip to content
            </a>
            <Header />
            <main
              id="main-content"
              tabIndex={-1}
              className="flex-1 focus:outline-none"
            >
              {children}
            </main>
            <Footer />
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}
