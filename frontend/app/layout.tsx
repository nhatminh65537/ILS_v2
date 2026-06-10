import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { MswProvider } from "@/components/providers/MswProvider";
import { ThemeProvider, ThemeNoFlashScript } from "@/components/providers/ThemeProvider";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ILS v2",
  description: "Self-hosted cybersecurity learning platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // lang defaults to the app default locale; the per-locale layout corrects
    // <html lang> to the active locale (see LocaleHtmlLang). suppressHydrationWarning
    // because the no-flash script mutates the class before hydration.
    <html lang="vi" className={cn("font-sans", inter.variable)} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeNoFlashScript />
        <ThemeProvider>
          <MswProvider>{children}</MswProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
