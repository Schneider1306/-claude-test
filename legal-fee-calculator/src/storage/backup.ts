// Логика резервного копирования: сборка, проверка и слияние/замена данных.
// Функции чистые, чтобы их можно было тестировать отдельно от файловой системы.

import { SCHEMA_VERSION, createDefaultSettings } from '@/constants/defaults';
import type { BackupData } from '@/domain/types';
import type { AppData } from './repository';

export interface BackupSummary {
  clients: number;
  cases: number;
  calculations: number;
  payments: number;
  schemaVersion: number;
  exportedAt: string;
}

export type ValidationResult =
  | { ok: true; data: BackupData; summary: BackupSummary }
  | { ok: false; error: string };

// Собрать объект резервной копии из текущих данных.
export function buildBackup(data: AppData): BackupData {
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appId: 'legal-fee-calculator',
    settings: data.settings,
    clients: data.clients,
    cases: data.cases,
    calculations: data.calculations,
    payments: data.payments,
  };
}

function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v);
}

// Проверить структуру и версию файла резервной копии перед импортом.
export function validateBackup(raw: unknown): ValidationResult {
  if (raw == null || typeof raw !== 'object') {
    return { ok: false, error: 'Файл пуст или имеет неверный формат.' };
  }
  const obj = raw as Record<string, unknown>;

  if (obj.appId !== 'legal-fee-calculator') {
    return {
      ok: false,
      error: 'Это не резервная копия приложения «Стоимость юруслуг».',
    };
  }

  if (typeof obj.schemaVersion !== 'number') {
    return { ok: false, error: 'В файле отсутствует версия данных.' };
  }

  if (obj.schemaVersion > SCHEMA_VERSION) {
    return {
      ok: false,
      error:
        'Файл создан в более новой версии приложения. Обновите приложение и повторите импорт.',
    };
  }

  if (
    obj.settings == null ||
    typeof obj.settings !== 'object' ||
    !isArray(obj.clients) ||
    !isArray(obj.cases) ||
    !isArray(obj.calculations) ||
    !isArray(obj.payments)
  ) {
    return { ok: false, error: 'Структура файла повреждена или неполная.' };
  }

  const data = obj as unknown as BackupData;
  const summary: BackupSummary = {
    clients: data.clients.length,
    cases: data.cases.length,
    calculations: data.calculations.length,
    payments: data.payments.length,
    schemaVersion: data.schemaVersion,
    exportedAt: data.exportedAt ?? '',
  };

  return { ok: true, data, summary };
}

// Преобразовать проверенную копию в AppData (с подстраховкой настроек).
export function backupToAppData(backup: BackupData): AppData {
  const defaults = createDefaultSettings();
  return {
    settings: {
      ...defaults,
      ...backup.settings,
      finance: { ...defaults.finance, ...backup.settings?.finance },
      thresholds: { ...defaults.thresholds, ...backup.settings?.thresholds },
    },
    clients: backup.clients ?? [],
    cases: backup.cases ?? [],
    calculations: backup.calculations ?? [],
    payments: backup.payments ?? [],
  };
}

// Слияние: сохраняем текущие записи, добавляем новые (по id — без дублей).
export function mergeData(current: AppData, incoming: AppData): AppData {
  return {
    settings: current.settings, // при слиянии оставляем текущие настройки
    clients: mergeById(current.clients, incoming.clients),
    cases: mergeById(current.cases, incoming.cases),
    calculations: mergeById(current.calculations, incoming.calculations),
    payments: mergeById(current.payments, incoming.payments),
  };
}

function mergeById<T extends { id: string }>(a: T[], b: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of a) map.set(item.id, item);
  for (const item of b) if (!map.has(item.id)) map.set(item.id, item);
  return Array.from(map.values());
}
