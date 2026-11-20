'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { toErrorMessage } from '@/lib/api/errors';
import { useApiQuery } from '@/lib/api/use-api-query';
import { auditControllerList } from '@/lib/api/generated/endpoints';
import type { AuditLogDto } from '@/lib/api/generated/models';

const ENTITY_FILTERS = [
  'ALL',
  'STUDENT',
  'TEACHER',
  'GUARDIAN',
  'USER',
  'CLASS',
  'EXAM',
  'FEE',
  'ATTENDANCE',
  'AUTH',
];

export default function AdminAuditPage() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState('ALL');
  const [expandedLog, setExpandedLog] = useState<AuditLogDto | null>(null);

  const query = useApiQuery(
    ['audit-logs', page, entityType],
    () =>
      auditControllerList({
        page,
        limit: 25,
        entityType: entityType === 'ALL' ? undefined : entityType,
      }),
  );

  const logs: AuditLogDto[] = (query.data as any)?.data ?? [];
  const meta = (query.data as any)?.meta ?? { page: 1, limit: 25, total: 0, totalPages: 1 };

  return (
    <div>
      <PageHeader
        title="Audit logs"
        description="Comprehensive audit trail of system events for Kenya Data Protection Act (2019) accountability."
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground mr-1">Filter entity:</span>
          {ENTITY_FILTERS.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setEntityType(type);
                setPage(1);
              }}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                entityType === type
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="text-xs text-muted-foreground">
          Showing {logs.length} of {meta.total} records
        </div>
      </div>

      {query.error ? (
        <div className="mb-4 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {toErrorMessage(query.error, 'Could not load audit logs')}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left font-medium text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Timestamp (EAT)</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity Type</th>
              <th className="px-4 py-3">Entity ID</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-md border border-input bg-background px-2 py-0.5 text-xs font-medium font-mono">
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-xs">{log.entityType}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {log.entityId ? log.entityId.slice(0, 8) + '…' : '—'}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {log.actorUserId ? log.actorUserId.slice(0, 8) + '…' : 'System'}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setExpandedLog(log)}
                    className="h-7 text-xs"
                  >
                    View
                  </Button>
                </td>
              </tr>
            ))}
            {logs.length === 0 && !query.isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No audit logs recorded yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1 || query.isLoading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </Button>
        <span className="text-xs text-muted-foreground">
          Page {meta.page} of {Math.max(1, meta.totalPages)}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= meta.totalPages || query.isLoading}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>

      {expandedLog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-lg border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Audit Event Detail</h3>
                <p className="text-xs text-muted-foreground font-mono">ID: {expandedLog.id}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setExpandedLog(null)}>
                ✕
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="font-semibold text-muted-foreground">Timestamp:</span>{' '}
                {new Date(expandedLog.createdAt).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">Action:</span> {expandedLog.action}
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">Entity:</span> {expandedLog.entityType} ({expandedLog.entityId ?? 'None'})
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">Actor User ID:</span> {expandedLog.actorUserId ?? 'System / Anonymous'}
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">Client IP:</span> {expandedLog.ip ?? '—'}
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">User Agent:</span> {expandedLog.userAgent ?? '—'}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground">Payload Snapshot:</span>
              <pre className="max-h-60 overflow-auto rounded-md bg-muted p-3 text-xs font-mono">
                {JSON.stringify(
                  { before: expandedLog.before, after: expandedLog.after },
                  null,
                  2,
                )}
              </pre>
            </div>

            <div className="flex justify-end">
              <Button size="sm" onClick={() => setExpandedLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
