// Экспорт и импорт файла резервной копии через модули, совместимые с Expo Go.

import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { BackupData } from '@/domain/types';

function backupFileName(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `legal-fee-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}

// Записать копию в файл и открыть системное окно «Поделиться».
export async function exportBackupFile(backup: BackupData): Promise<void> {
  const file = new File(Paths.cache, backupFileName());
  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(JSON.stringify(backup, null, 2));

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Сохранить резервную копию',
      UTI: 'public.json',
    });
  } else {
    throw new Error('На этом устройстве недоступно системное окно «Поделиться».');
  }
}

// Выбрать файл и прочитать его как JSON. Возвращает «сырые» данные или null (отмена).
export async function pickBackupFile(): Promise<unknown | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }
  const asset = result.assets[0];
  const file = new File(asset.uri);
  const content = await file.text();
  return JSON.parse(content);
}
