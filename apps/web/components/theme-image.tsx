"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type ThemeImageProps = {
  lightSrc: string;
  darkSrc: string;
  width: number;
  height: number;
  sizes?: string;
  alt: string;
  className?: string;
};

export function ThemeImage({
  lightSrc,
  darkSrc,
  width,
  height,
  sizes,
  alt,
  className,
}: ThemeImageProps) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () =>
      setTheme(root.dataset.theme === "dark" ? "dark" : "light");
    const observer = new MutationObserver(syncTheme);

    syncTheme();
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <Image
      src={theme === "dark" ? darkSrc : lightSrc}
      width={width}
      height={height}
      sizes={sizes}
      alt={alt}
      className={className}
    />
  );
}
