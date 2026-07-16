import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextResponse } from "next/server";
import { restoreFromBackupFile } from "@/db/backup";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "Файл не передан." }, { status: 400 });
  }
  if (!file.name.endsWith(".db")) {
    return NextResponse.json(
      { ok: false, message: "Ожидается файл резервной копии с расширением .db" },
      { status: 400 },
    );
  }

  const tmpPath = path.join(os.tmpdir(), `restore-upload-${Date.now()}.db`);
  const arrayBuffer = await file.arrayBuffer();
  fs.writeFileSync(tmpPath, Buffer.from(arrayBuffer));

  try {
    const result = await restoreFromBackupFile(tmpPath);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } finally {
    fs.unlinkSync(tmpPath);
  }
}
