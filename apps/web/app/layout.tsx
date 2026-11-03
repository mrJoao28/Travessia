import type { Metadata } from "next";
import { ThemeBootstrap } from "../components/theme-bootstrap";
import { NavigationLibras } from "../components/navigation-libras";
import "./globals.css";

export const metadata: Metadata = {
  title: "Travessia · Aprender e avançar",
  description: "Aprendizagem por missões, um passo de cada vez.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" data-theme="light" data-contrast="false">
      <body className="has-libras-navigation">
        <ThemeBootstrap />
        {children}
        <NavigationLibras />
      </body>
    </html>
  );
}
