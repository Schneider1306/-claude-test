import fs from "node:fs";
import path from "node:path";

export default function globalSetup() {
  const dataDir = path.join(process.cwd(), ".e2e-data");
  fs.rmSync(dataDir, { recursive: true, force: true });
}
