import { manualBackupCopyPath } from "../src/db/backup";

const path = manualBackupCopyPath();
console.log(`Резервная копия создана: ${path}`);
