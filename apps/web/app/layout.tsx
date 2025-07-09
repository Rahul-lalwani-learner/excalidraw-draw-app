import "./globals.css";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AuthProvider } from '../contexts/AuthContext'

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Chat App - ExcaliDraw",
  description: "Real-time chat application with room management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={geist.className} suppressHydrationWarning={true}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
