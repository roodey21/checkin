import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CheckInProvider } from "@/context/CheckInContext";

const inter = Inter({ subsets: ["latin"] });
const themeClassName = "theme-light";

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
    <html lang="id" className={themeClassName}>
      <body className={`${inter.className} bg-slate-50 text-slate-900 min-h-screen antialiased selection:bg-sky-500 selection:text-white`}>
        <CheckInProvider>
          {children}
        </CheckInProvider>
      </body>
    </html>
  );
}
