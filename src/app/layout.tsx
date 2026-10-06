import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthEntry } from "@/features/auth/auth-entry";

export const metadata: Metadata = {
  title: { default: "HERCULES · Entrenamiento", template: "%s · HERCULES" },
  description: "Tu entrenamiento, tus rutinas y tu progreso.",
  icons: {
    icon: "/assets/hercules-logo-v1.jpg",
    apple: "/assets/hercules-logo-v1.jpg",
  },
};

export const viewport: Viewport = {
  themeColor: "#090b10",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body>
        <AuthEntry />
        {children}
      </body>
    </html>
  );
}
