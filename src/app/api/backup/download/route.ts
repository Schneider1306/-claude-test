import fs from "node:fs";
import { NextResponse } from "next/server";
import { createBackup } from "@/db/backup";

export async function GET() {
  const backup = await createBackup("manual");
  if (!backup) {
    return NextResponse.json(
      { error: "База данных ещё не создана." },
      { status: 404 },
    );
  }
  const buffer = fs.readFileSync(backup.filePath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/x-sqlite3",
      "Content-Disposition": `attachment; filename="${backup.fileName}"`,
    },
  });
}
