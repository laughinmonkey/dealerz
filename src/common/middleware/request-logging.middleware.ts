import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PinoLoggerService } from '../logger/pino-logger.service';

/**
 * Logs every HTTP request with method, URL, status, duration, and
 * (at debug level) request body and headers.  Incoming requests are
 * logged immediately; the summary with status code is logged on
 * response finish.
 */
@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new PinoLoggerService();

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip, headers } = req;
    const start = Date.now();

    // ── Incoming request ──────────────────────────────────────
    this.logger.log(
      {
        method,
        url: originalUrl,
        ip,
        userAgent: headers['user-agent'] ?? '-',
        // only included at debug level to keep prod logs lean
      },
      'HTTP',
    );

    // ── Debug: log request body & query ───────────────────────
    this.logger.debug(
      {
        method,
        url: originalUrl,
        query: req.query,
        body: this.sanitizeBody(req.body),
      },
      'HTTP',
    );

    // ── Summary on finish ─────────────────────────────────────
    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - start;
      const level =
        statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'log';

      this.logger[level](
        {
          method,
          url: originalUrl,
          statusCode,
          duration: `${duration}ms`,
        },
        'HTTP',
      );
    });

    next();
  }

  // ─── Helpers ─────────────────────────────────────────────────

  /**
   * Strip potentially large or sensitive fields from the request body
   * to avoid log bloat and leaking secrets.
   */
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
