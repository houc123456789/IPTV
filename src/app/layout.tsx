import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IPTV Player - Futuristic Streaming",
  description: "Application de lecture IPTV futuriste avec support M3U et Xtream Code",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased cyber-grid min-h-screen">
        <div className="scan-line" />
        {children}
      </body>
    </html>
  );
}
