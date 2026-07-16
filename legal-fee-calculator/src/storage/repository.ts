// Слой репозитория поверх AsyncStorage.
// Отвечает за чтение/запись, версию схемы и безопасные миграции.
// Экраны не обращаются к AsyncStorage напрямую — только через этот модуль.

import AsyncStorage from '@react-native-async-storage/async-storage';

import { SCHEMA_VERSION, createDefaultSettings } from '@/constants/defaults';
import type {
  Calculation,
  Client,
  LegalCase,
  Payment,
  Settings,
} from '@/domain/types';

const KEYS = {
  schemaVersion: 'lfc.schemaVersion',
  settings: 'lfc.settings',
  clients: 'lfc.clients',
  cases: 'lfc.cases',
  calculations: 'lfc.calculations',
  payments: 'lfc.payments',
  lastAutoBackup: 'lfc.lastAutoBackup',
} as const;

export interface AppData {
  settings: Settings;
  clients: Client[];
  cases: LegalCase[];
  calculations: Calculation[];
  payments: Payment[];
}

// Каркас миграций. Ключ — версия, из которой мигрируем.
// Функция получает «сырые» данные и возвращает данные следующей версии.
// Так при изменении структуры мы не очищаем хранилище, а аккуратно обновляем.
type RawData = Record<string, unknown>;
type Migration = (data: RawData) => RawData;

const MIGRATIONS: Record<number, Migration> = {
  // Пример будущей миграции:
  // 1: (data) => ({ ...data, settings: addNewField(data.settings) }),
};

function runMigrations(fromVersion: number, data: RawData): RawData {
  let version = fromVersion;
  let current = data;
  while (version < SCHEMA_VERSION) {
    const migrate = MIGRATIONS[version];
    if (migrate) {
      current = migrate(current);
    }
    version += 1;
  }
  return current;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

// Загрузить все данные. При первом запуске создаёт настройки по умолчанию.
export async function loadAll(): Promise<AppData> {
  const storedVersionRaw = await AsyncStorage.getItem(KEYS.schemaVersion);
  const storedVersion = storedVersionRaw ? parseInt(storedVersionRaw, 10) : null;

  const defaults = createDefaultSettings();

  let settings = await readJson<Settings>(KEYS.settings, defaults);
  let clients = await readJson<Client[]>(KEYS.clients, []);
  let cases = await readJson<LegalCase[]>(KEYS.cases, []);
  let calculations = await readJson<Calculation[]>(KEYS.calculations, []);
  let payments = await readJson<Payment[]>(KEYS.payments, []);

  // Первый запуск: сохраняем стартовые настройки и версию.
  if (storedVersion == null) {
    await writeJson(KEYS.settings, settings);
    await AsyncStorage.setItem(KEYS.schemaVersion, String(SCHEMA_VERSION));
  } else if (storedVersion < SCHEMA_VERSION) {
    // Миграция без потери данных.
    const migrated = runMigrations(storedVersion, {
      settings,
      clients,
      cases,
      calculations,
      payments,
    });
    settings = (migrated.settings as Settings) ?? settings;
    clients = (migrated.clients as Client[]) ?? clients;
    cases = (migrated.cases as LegalCase[]) ?? cases;
    calculations = (migrated.calculations as Calculation[]) ?? calculations;
    payments = (migrated.payments as Payment[]) ?? payments;
    await persistAll({ settings, clients, cases, calculations, payments });
    await AsyncStorage.setItem(KEYS.schemaVersion, String(SCHEMA_VERSION));
  }

  // Гарантируем наличие обязательных полей настроек (на случай частичных данных).
  settings = mergeSettings(defaults, settings);

  return { settings, clients, cases, calculations, payments };
}

// Слить настройки с дефолтными, чтобы не потерять новые поля.
function mergeSettings(defaults: Settings, stored: Settings): Settings {
  return {
    schemaVersion: SCHEMA_VERSION,
    finance: { ...defaults.finance, ...stored.finance },
    thresholds: { ...defaults.thresholds, ...stored.thresholds },
    catalog: stored.catalog?.length ? stored.catalog : defaults.catalog,
    complexityOptions: stored.complexityOptions?.length
      ? stored.complexityOptions
      : defaults.complexityOptions,
    urgencyOptions: stored.urgencyOptions?.length
      ? stored.urgencyOptions
      : defaults.urgencyOptions,
    installmentOptions: stored.installmentOptions?.length
      ? stored.installmentOptions
      : defaults.installmentOptions,
    travelOptions: stored.travelOptions?.length
      ? stored.travelOptions
      : defaults.travelOptions,
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await writeJson(KEYS.settings, settings);
}

export async function saveClients(clients: Client[]): Promise<void> {
  await writeJson(KEYS.clients, clients);
}

export async function saveCases(cases: LegalCase[]): Promise<void> {
  await writeJson(KEYS.cases, cases);
}

export async function saveCalculations(calculations: Calculation[]): Promise<void> {
  await writeJson(KEYS.calculations, calculations);
}

export async function savePayments(payments: Payment[]): Promise<void> {
  await writeJson(KEYS.payments, payments);
}

export async function persistAll(data: AppData): Promise<void> {
  await AsyncStorage.multiSet([
    [KEYS.settings, JSON.stringify(data.settings)],
    [KEYS.clients, JSON.stringify(data.clients)],
    [KEYS.cases, JSON.stringify(data.cases)],
    [KEYS.calculations, JSON.stringify(data.calculations)],
    [KEYS.payments, JSON.stringify(data.payments)],
    [KEYS.schemaVersion, String(SCHEMA_VERSION)],
  ]);
}

// Локальная автоматическая резервная копия (перед заменой при импорте).
export async function saveAutoBackup(data: AppData): Promise<void> {
  const backup = {
    schemaVersion: SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    data,
  };
  await writeJson(KEYS.lastAutoBackup, backup);
}

export async function loadAutoBackup(): Promise<AppData | null> {
  const backup = await readJson<{ data: AppData } | null>(KEYS.lastAutoBackup, null);
  return backup?.data ?? null;
}
