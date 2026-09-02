import type { MetadataRoute } from "next";
import { ICON_BACKGROUND } from "@/lib/pwa-icon";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Калькулятор стоимости юридических услуг",
    short_name: "Калькулятор услуг",
    description: "Расчёт стоимости юридических услуг, трудозатрат и эффективной ставки",
    start_url: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: ICON_BACKGROUND,
    theme_color: ICON_BACKGROUND,
    lang: "ru",
    icons: [
      { src: "/pwa-icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
