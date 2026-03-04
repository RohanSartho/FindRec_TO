import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { FavouritesProvider } from "@/lib/context/FavouritesContext";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FindRec TO — Toronto Parks & Recreation",
  description: "One-stop destination for Toronto Parks & Recreation activities.",
};

export const viewport: Viewport = {
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} antialiased text-gray-900`} style={{ backgroundColor: "#f5f2ec" }}>
        <FavouritesProvider>
          <Navbar />
          <main>{children}</main>
        </FavouritesProvider>
      </body>
    </html>
  );
}
