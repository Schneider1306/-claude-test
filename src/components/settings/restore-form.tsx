"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function RestoreForm() {
  const router = useRouter();
  const [file, setFile] = React.useState<File | null>(null);
  const [message, setMessage] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    if (
      !confirm(
        "Восстановление заменит текущую базу данных выбранным файлом резервной копии. Перед заменой будет автоматически создана аварийная копия текущей базы. Продолжить?",
      )
    ) {
      return;
    }
    setPending(true);
    setMessage(null);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/restore", { method: "POST", body: formData });
    const data = await res.json();
    setMessage({ ok: data.ok, text: data.message });
    setPending(false);
    if (data.ok) router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <input
        type="file"
        accept=".db"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="text-sm"
      />
      <Button type="submit" variant="outline" disabled={!file || pending} className="w-fit">
        {pending ? "Восстановление…" : "Восстановить из файла"}
      </Button>
      {message && (
        <p className={`text-sm ${message.ok ? "text-accent" : "text-danger"}`}>{message.text}</p>
      )}
    </form>
  );
}
