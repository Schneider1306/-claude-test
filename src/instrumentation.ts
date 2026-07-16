export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runStartupBackupOnce } = await import("./db/backup");
    await runStartupBackupOnce();
  }
}
