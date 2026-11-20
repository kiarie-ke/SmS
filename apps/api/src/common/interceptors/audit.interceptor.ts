import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { tap, type Observable } from 'rxjs';
import { AuditRepositoryPort } from '../../audit/audit.repository';
import type { AuthenticatedUser } from '../auth-user';

/** HTTP methods that represent mutations worth logging. */
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Automatically records an audit-log entry for every successful mutation
 * (POST / PUT / PATCH / DELETE).  Read-only GETs are skipped.
 *
 * The log captures:
 *   – actor (from JWT)
 *   – action  (HTTP method + route path)
 *   – entityType (controller route prefix, e.g. "students")
 *   – entityId (first :id param if present)
 *   – after (response body, capped to avoid huge payloads)
 *   – ip and user-agent
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditRepositoryPort) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<any>();
    const method: string = request.method ?? '';

    if (!MUTATION_METHODS.has(method.toUpperCase())) {
      return next.handle();
    }

    const user: AuthenticatedUser | undefined = request.user;
    const route: string = request.route?.path ?? request.url ?? '';
    const entityType = this.extractEntityType(route);
    const entityId = request.params?.id ?? null;
    const ip = request.ip ?? request.connection?.remoteAddress ?? null;
    const userAgent = request.headers?.['user-agent'] ?? null;

    return next.handle().pipe(
      tap((responseBody) => {
        // Fire-and-forget: do not block the response
        this.audit
          .record({
            actorUserId: user?.id ?? null,
            action: `${method.toUpperCase()} ${route}`,
            entityType,
            entityId,
            after: this.truncate(responseBody),
            ip,
            userAgent,
          })
          .catch(() => {
            // swallow — audit failure must never break business logic
          });
      }),
    );
  }

  /** Extracts the first meaningful path segment, e.g. /api/students/:id → "students". */
  private extractEntityType(route: string): string {
    const segments = route.replace(/^\/api\//, '').split('/').filter(Boolean);
    return segments[0] ?? 'unknown';
  }

  /** Prevents giant response bodies from being stored in the audit table. */
  private truncate(value: unknown): unknown {
    try {
      const json = JSON.stringify(value);
      if (json && json.length > 4096) {
        return { _truncated: true, preview: json.slice(0, 2048) };
      }
      return value;
    } catch {
      return { _error: 'Could not serialize response' };
    }
  }
}
