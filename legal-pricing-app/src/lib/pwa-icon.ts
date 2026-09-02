import { createElement } from "react";

export const ICON_BACKGROUND = "#15305a";
export const ICON_FOREGROUND = "#ffffff";
export const ICON_ACCENT = "#2dd4bf";

/** Общая разметка иконки приложения (без сборки в JSX, чтобы работать и в .ts route-файлах). */
export function buildIconElement(sizePx: number) {
  return createElement(
    "div",
    {
      style: {
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: ICON_BACKGROUND,
        fontFamily: "sans-serif",
      },
    },
    createElement(
      "span",
      {
        style: {
          fontSize: sizePx * 0.58,
          fontWeight: 700,
          color: ICON_FOREGROUND,
          lineHeight: 1,
        },
      },
      "₽",
    ),
    createElement("span", {
      style: {
        position: "absolute",
        bottom: sizePx * 0.14,
        width: sizePx * 0.3,
        height: sizePx * 0.045,
        borderRadius: sizePx * 0.03,
        background: ICON_ACCENT,
      },
    }),
  );
}
