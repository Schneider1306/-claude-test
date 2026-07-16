/** Небольшой генератор CSV (RFC 4180) без внешних зависимостей, с BOM для корректного открытия в Excel. */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escapeCell = (value: string | number | null | undefined): string => {
    const s = value === null || value === undefined ? "" : String(value);
    if (/[",;\n\r]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [headers.map(escapeCell).join(";")];
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(";"));
  }
  return "﻿" + lines.join("\r\n");
}
