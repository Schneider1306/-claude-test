import { NextResponse } from "next/server";
import { exportAllDataAsJson } from "@/db/export";

export async function GET() {
  const data = exportAllDataAsJson();
  const json = JSON.stringify(data, null, 2);
  const fileName = `legal-practice-export-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
