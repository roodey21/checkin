import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CheckInProvider } from "@/context/CheckInContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Web Check-in | PTPN Finance & Risk Leaders Forum 2026",
  description: "Sistem Web Check-in Mandiri untuk PTPN Finance & Risk Leaders Forum 2026.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${inter.className} bg-slate-950 text-slate-100 min-h-screen antialiased selection:bg-sky-500 selection:text-white`}>
        <CheckInProvider>
          {children}
        </CheckInProvider>
      </body>
    </html>
  );
}
