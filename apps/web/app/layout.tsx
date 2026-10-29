import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Travessia · Aprender e avançar",
  description: "Aprendizagem por missões, um passo de cada vez.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
