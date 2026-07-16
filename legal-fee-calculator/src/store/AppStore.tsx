// Глобальное состояние приложения. Загружает данные из репозитория,
// держит их в памяти и сохраняет каждое изменение.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { createDefaultSettings } from '@/constants/defaults';
import { calculate } from '@/domain/engine';
import type {
  BackupData,
  Calculation,
  CalcInput,
  Client,
  LegalCase,
  Payment,
  Settings,
} from '@/domain/types';
import * as repo from '@/storage/repository';
import type { AppData } from '@/storage/repository';
import {
  backupToAppData,
  buildBackup,
  mergeData,
} from '@/storage/backup';
import { generateId } from '@/utils/id';

interface AppStore extends AppData {
  loading: boolean;
  reload: () => Promise<void>;

  // Клиенты
  addClient: (data: Omit<Client, 'id' | 'createdAt' | 'archived'>) => Promise<Client>;
  updateClient: (client: Client) => Promise<void>;
  setClientArchived: (id: string, archived: boolean) => Promise<void>;
  deleteClient: (id: string, cascade: boolean) => Promise<void>;

  // Дела
  addCase: (data: Omit<LegalCase, 'id' | 'createdAt' | 'archived'>) => Promise<LegalCase>;
  updateCase: (legalCase: LegalCase) => Promise<void>;
  setCaseArchived: (id: string, archived: boolean) => Promise<void>;
  deleteCase: (id: string, cascade: boolean) => Promise<void>;

  // Расчёты
  addCalculation: (params: {
    clientId: string;
    caseId: string;
    input: CalcInput;
  }) => Promise<Calculation>;

  // Платежи
  addPayment: (data: Omit<Payment, 'id' | 'createdAt'>) => Promise<Payment>;
  deletePayment: (id: string) => Promise<void>;

  // Настройки
  updateSettings: (settings: Settings) => Promise<void>;
  resetSettings: () => Promise<void>;

  // Резервное копирование
  buildBackupData: () => BackupData;
  importBackup: (backup: BackupData, mode: 'merge' | 'replace') => Promise<void>;
}

const AppContext = createContext<AppStore | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(createDefaultSettings());
  const [clients, setClients] = useState<Client[]>([]);
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [calculations, setCalculations] = useState<Calculation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const data = await repo.loadAll();
    setSettings(data.settings);
    setClients(data.clients);
    setCases(data.cases);
    setCalculations(data.calculations);
    setPayments(data.payments);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // --- Клиенты ---
  const addClient = useCallback<AppStore['addClient']>(
    async (data) => {
      const client: Client = {
        ...data,
        id: generateId('cl'),
        archived: false,
        createdAt: new Date().toISOString(),
      };
      const next = [client, ...clients];
      setClients(next);
      await repo.saveClients(next);
      return client;
    },
    [clients]
  );

  const updateClient = useCallback<AppStore['updateClient']>(
    async (client) => {
      const next = clients.map((c) => (c.id === client.id ? client : c));
      setClients(next);
      await repo.saveClients(next);
    },
    [clients]
  );

  const setClientArchived = useCallback<AppStore['setClientArchived']>(
    async (id, archived) => {
      const next = clients.map((c) => (c.id === id ? { ...c, archived } : c));
      setClients(next);
      await repo.saveClients(next);
    },
    [clients]
  );

  const deleteClient = useCallback<AppStore['deleteClient']>(
    async (id, cascade) => {
      const nextClients = clients.filter((c) => c.id !== id);
      setClients(nextClients);
      await repo.saveClients(nextClients);
      if (cascade) {
        const caseIds = cases.filter((c) => c.clientId === id).map((c) => c.id);
        const nextCases = cases.filter((c) => c.clientId !== id);
        const nextCalcs = calculations.filter(
          (c) => c.clientId !== id && !caseIds.includes(c.caseId)
        );
        const nextPays = payments.filter(
          (p) => p.clientId !== id && !caseIds.includes(p.caseId)
        );
        setCases(nextCases);
        setCalculations(nextCalcs);
        setPayments(nextPays);
        await repo.saveCases(nextCases);
        await repo.saveCalculations(nextCalcs);
        await repo.savePayments(nextPays);
      }
    },
    [clients, cases, calculations, payments]
  );

  // --- Дела ---
  const addCase = useCallback<AppStore['addCase']>(
    async (data) => {
      const legalCase: LegalCase = {
        ...data,
        id: generateId('cs'),
        archived: false,
        createdAt: new Date().toISOString(),
      };
      const next = [legalCase, ...cases];
      setCases(next);
      await repo.saveCases(next);
      return legalCase;
    },
    [cases]
  );

  const updateCase = useCallback<AppStore['updateCase']>(
    async (legalCase) => {
      const next = cases.map((c) => (c.id === legalCase.id ? legalCase : c));
      setCases(next);
      await repo.saveCases(next);
    },
    [cases]
  );

  const setCaseArchived = useCallback<AppStore['setCaseArchived']>(
    async (id, archived) => {
      const next = cases.map((c) => (c.id === id ? { ...c, archived } : c));
      setCases(next);
      await repo.saveCases(next);
    },
    [cases]
  );

  const deleteCase = useCallback<AppStore['deleteCase']>(
    async (id, cascade) => {
      const nextCases = cases.filter((c) => c.id !== id);
      setCases(nextCases);
      await repo.saveCases(nextCases);
      if (cascade) {
        const nextCalcs = calculations.filter((c) => c.caseId !== id);
        const nextPays = payments.filter((p) => p.caseId !== id);
        setCalculations(nextCalcs);
        setPayments(nextPays);
        await repo.saveCalculations(nextCalcs);
        await repo.savePayments(nextPays);
      }
    },
    [cases, calculations, payments]
  );

  // --- Расчёты ---
  const addCalculation = useCallback<AppStore['addCalculation']>(
    async ({ clientId, caseId, input }) => {
      const client = clients.find((c) => c.id === clientId);
      const legalCase = cases.find((c) => c.id === caseId);
      const result = calculate(input, settings.finance, settings.thresholds);
      const version =
        calculations.filter((c) => c.caseId === caseId).length + 1;
      const calc: Calculation = {
        id: generateId('calc'),
        version,
        createdAt: new Date().toISOString(),
        clientId,
        caseId,
        clientName: client?.name ?? '',
        caseTitle: legalCase?.title ?? '',
        category: legalCase?.category ?? 'other',
        status: legalCase?.status ?? 'draft',
        input,
        // Неизменяемый снимок использованных настроек:
        financeSnapshot: { ...settings.finance },
        thresholdsSnapshot: { ...settings.thresholds },
        result,
      };
      const next = [calc, ...calculations];
      setCalculations(next);
      await repo.saveCalculations(next);
      return calc;
    },
    [clients, cases, calculations, settings]
  );

  // --- Платежи ---
  const addPayment = useCallback<AppStore['addPayment']>(
    async (data) => {
      const payment: Payment = {
        ...data,
        amount: Math.max(0, Math.round(data.amount)),
        id: generateId('pay'),
        createdAt: new Date().toISOString(),
      };
      const next = [payment, ...payments];
      setPayments(next);
      await repo.savePayments(next);
      return payment;
    },
    [payments]
  );

  const deletePayment = useCallback<AppStore['deletePayment']>(
    async (id) => {
      const next = payments.filter((p) => p.id !== id);
      setPayments(next);
      await repo.savePayments(next);
    },
    [payments]
  );

  // --- Настройки ---
  const updateSettings = useCallback<AppStore['updateSettings']>(
    async (nextSettings) => {
      setSettings(nextSettings);
      await repo.saveSettings(nextSettings);
    },
    []
  );

  const resetSettings = useCallback<AppStore['resetSettings']>(async () => {
    const defaults = createDefaultSettings();
    setSettings(defaults);
    await repo.saveSettings(defaults);
  }, []);

  // --- Резервное копирование ---
  const buildBackupData = useCallback<AppStore['buildBackupData']>(() => {
    return buildBackup({ settings, clients, cases, calculations, payments });
  }, [settings, clients, cases, calculations, payments]);

  const importBackup = useCallback<AppStore['importBackup']>(
    async (backup, mode) => {
      const current: AppData = {
        settings,
        clients,
        cases,
        calculations,
        payments,
      };
      // Автоматическая локальная копия перед заменой.
      await repo.saveAutoBackup(current);
      const incoming = backupToAppData(backup);
      const nextData = mode === 'replace' ? incoming : mergeData(current, incoming);
      await repo.persistAll(nextData);
      setSettings(nextData.settings);
      setClients(nextData.clients);
      setCases(nextData.cases);
      setCalculations(nextData.calculations);
      setPayments(nextData.payments);
    },
    [settings, clients, cases, calculations, payments]
  );

  const value = useMemo<AppStore>(
    () => ({
      settings,
      clients,
      cases,
      calculations,
      payments,
      loading,
      reload,
      addClient,
      updateClient,
      setClientArchived,
      deleteClient,
      addCase,
      updateCase,
      setCaseArchived,
      deleteCase,
      addCalculation,
      addPayment,
      deletePayment,
      updateSettings,
      resetSettings,
      buildBackupData,
      importBackup,
    }),
    [
      settings,
      clients,
      cases,
      calculations,
      payments,
      loading,
      reload,
      addClient,
      updateClient,
      setClientArchived,
      deleteClient,
      addCase,
      updateCase,
      setCaseArchived,
      deleteCase,
      addCalculation,
      addPayment,
      deletePayment,
      updateSettings,
      resetSettings,
      buildBackupData,
      importBackup,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppStore {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp должен использоваться внутри AppProvider');
  }
  return ctx;
}
