import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { formatDateRu } from "@/domain/calculations";
import type { BackupFileInfo } from "@/db/backup";
import { RestoreForm } from "./restore-form";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} байт`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export function DataBackupTab({ backups }: { backups: BackupFileInfo[] }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Резервное копирование</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Резервная копия создаётся автоматически при каждом запуске приложения и перед восстановлением из
            файла. Хранятся последние 10 копий. База данных работает в режиме WAL и использует транзакции SQLite.
          </p>
          <div className="flex flex-wrap gap-2 no-print">
            <a href="/api/backup/download">
              <Button variant="outline">Скачать резервную копию сейчас</Button>
            </a>
            <a href="/api/export/json">
              <Button variant="outline">Экспорт всех данных в JSON</Button>
            </a>
            <a href="/api/export/cases-csv">
              <Button variant="outline">Экспорт дел в CSV</Button>
            </a>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Последние резервные копии</CardTitle>
        </CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>Файл</Th>
              <Th>Дата</Th>
              <Th className="text-right">Размер</Th>
            </tr>
          </Thead>
          <Tbody>
            {backups.map((b) => (
              <Tr key={b.fileName}>
                <Td className="font-mono text-xs">{b.fileName}</Td>
                <Td>{formatDateRu(b.createdAt)}</Td>
                <Td className="text-right">{formatSize(b.sizeBytes)}</Td>
              </Tr>
            ))}
            {backups.length === 0 && (
              <Tr>
                <Td colSpan={3} className="py-6 text-center text-muted-foreground">
                  Резервных копий пока нет.
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </Card>

      <Card className="no-print">
        <CardHeader>
          <CardTitle>Восстановление из резервной копии</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Файл проверяется на целостность SQLite и наличие обязательных таблиц перед восстановлением. Текущая
            база данных автоматически сохраняется как аварийная копия перед заменой.
          </p>
          <RestoreForm />
          <p className="text-xs text-warning">
            После восстановления перезапустите приложение (остановите и запустите заново), чтобы изменения
            вступили в силу.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Защита данных</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p>Приложение работает полностью локально: не отправляет данные во внешние сервисы и не содержит телеметрии.</p>
          <p>
            Пароль интерфейса (если вы его настроите на уровне ОС/экрана) не является шифрованием диска — файл
            базы данных на диске не зашифрован. Не храните в системе больше персональных и медицинских сведений,
            чем необходимо: по умолчанию используйте обезличенный код клиента вместо ФИО.
          </p>
          <p>Удаление дел — мягкое: данные остаются в базе и могут быть восстановлены из карточки дела.</p>
        </CardContent>
      </Card>
    </div>
  );
}
