import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { PinoLoggerService } from '../logger/pino-logger.service';

/**
 * Logs method entry, exit, duration, and errors for every controller
 * and service method invocation.  Attaches the class and method name
 * as log context for easy tracing.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new PinoLoggerService();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
    const controller = context.getClass();

    const className = controller.name;
    const methodName = handler.name;
    const contextLabel = `${className}.${methodName}`;

    const args = context.getArgs();
    const requestArgs = this.extractArgs(context);

    // ── Method entry ──────────────────────────────────────────
    this.logger.debug(
      {
        context: contextLabel,
        args: requestArgs,
      },
      'MethodCall',
    );

    const start = Date.now();

    return next.handle().pipe(
      tap((result) => {
        const duration = Date.now() - start;

        this.logger.debug(
          {
            context: contextLabel,
            duration: `${duration}ms`,
            success: true,
          },
          'MethodCall',
        );
      }),
      catchError((error) => {
        const duration = Date.now() - start;

        this.logger.warn(
          {
            context: contextLabel,
            duration: `${duration}ms`,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          },
          'MethodCall',
        );

        throw error; // re-throw so the exception filter still sees it
      }),
    );
  }

  /**
   * Extract sanitized arguments from the execution context.
   * For HTTP requests, we capture query, params, and body.
   * For non-HTTP contexts (e.g., microservices), we capture raw args
   * but strip large blobs.
   */
  private extractArgs(context: ExecutionContext): any {
    try {
      const httpContext = context.switchToHttp();
      const request = httpContext.getRequest();
      if (request) {
        return {
          params: request.params,
          query: request.query,
          body: this.sanitizeBody(request.body),
        };
      }
    } catch {
      // Not an HTTP context — use the raw args
    }

    const args = context.getArgs();
    // For non-HTTP, just log arg types to avoid huge logs
    return args.map((a: any) =>
      a && typeof a === 'object' ? `[${a.constructor?.name || 'Object'}]` : a,
    );
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const sensitive = [
      'password',
      'passwordHash',
      'token',
      'refreshToken',
      'accessToken',
      'secret',
      'cvv',
      'cardNumber',
      'ssn',
      'identityDocument',
    ];

    const clone = { ...body };
    for (const key of sensitive) {
      if (clone[key] !== undefined) clone[key] = '[REDACTED]';
    }
    return clone;
  }
}
