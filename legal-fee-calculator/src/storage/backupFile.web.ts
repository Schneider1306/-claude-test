// Веб-версия экспорта/импорта резервной копии для Safari на iPhone.
// Не использует нативные модули: экспорт — через системное «Поделиться» или
// скачивание файла; импорт — через выбор файла.

import type { BackupData } from '@/domain/types';

function backupFileName(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `legal-fee-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}

// Записать копию в файл: сперва пробуем нативное окно «Поделиться» (Safari iOS),
// иначе — обычное скачивание файла.
export async function exportBackupFile(backup: BackupData): Promise<void> {
  const json = JSON.stringify(backup, null, 2);
  const name = backupFileName();
  const blob = new Blob([json], { type: 'application/json' });

  const nav = navigator as Navigator & {
    canShare?: (data?: unknown) => boolean;
    share?: (data?: unknown) => Promise<void>;
  };

  // Web Share API с файлом — на iPhone открывает системный лист «Поделиться»
  // (можно сохранить в «Файлы» или отправить себе).
  try {
    if (typeof File !== 'undefined' && nav.canShare) {
      const file = new File([blob], name, { type: 'application/json' });
      if (nav.canShare({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], title: 'Резервная копия' });
        return;
      }
    }
  } catch {
    // Пользователь отменил или обмен не удался — переходим к скачиванию.
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Выбрать файл и прочитать его как JSON. Возвращает «сырые» данные или null.
export async function pickBackupFile(): Promise<unknown | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.style.position = 'fixed';
    input.style.left = '-9999px';

    input.onchange = async () => {
      const file = input.files && input.files[0];
      input.remove();
      if (!file) {
        resolve(null);
        return;
      }
      try {
        const text = await file.text();
        resolve(JSON.parse(text));
      } catch {
        reject(new Error('Не удалось прочитать файл. Убедитесь, что это резервная копия в формате JSON.'));
      }
    };

    document.body.appendChild(input);
    input.click();
  });
}
