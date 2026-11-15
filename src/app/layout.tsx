import type { Metadata, Viewport } from "next";
import { Heebo, JetBrains_Mono } from "next/font/google";
import { DirectionProvider } from "@/components/ui/direction";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-sans",
  subsets: ["hebrew", "latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "MEAT STOCK", template: "%s · MEAT STOCK" },
  description: "מערכת ניהול מלאי לחנות מפעל בשר",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#7a1f24",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${heebo.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <DirectionProvider dir="rtl">
          <TooltipProvider>
            {children}
            <Toaster position="top-center" richColors closeButton />
          </TooltipProvider>
        </DirectionProvider>
      </body>
    </html>
  );
}
