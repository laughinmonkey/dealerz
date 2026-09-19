import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PinoLoggerService } from '../logger/pino-logger.service';

interface ExceptionResponseObject {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

/**
 * Catches every exception thrown during request processing, returns a
 * standardized error envelope, and logs the exception with full context
 * (including stack traces for server errors).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new PinoLoggerService();

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string;
    let errors: { field: string; message: string }[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as ExceptionResponseObject;
        const respMessage = resp.message ?? 'An error occurred.';

        if (Array.isArray(respMessage)) {
          errors = respMessage.map((msg: string) => ({
            field: 'unknown',
            message: msg,
          }));
          message = 'Validation failed.';
        } else {
          message = respMessage;
        }
      } else {
        message = 'An error occurred.';
      }

      // ── Log all HTTP exceptions with appropriate level ──────
      if (status >= 500) {
        this.logger.error(
          {
            err: exception,
            method: request.method,
            url: request.originalUrl,
            statusCode: status,
            body: this.sanitizeBody(request.body),
          },
          'ExceptionFilter',
        );
      } else {
        this.logger.warn(
          {
            method: request.method,
            url: request.originalUrl,
            statusCode: status,
            message,
          },
          'ExceptionFilter',
        );
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'An unexpected error occurred.';

      this.logger.error(
        {
          err: exception instanceof Error ? exception : new Error(String(exception)),
          method: request.method,
          url: request.originalUrl,
          statusCode: status,
          body: this.sanitizeBody(request.body),
        },
        'ExceptionFilter',
      );
    }

    response.status(status).json({
      success: false,
      message,
      errors,
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────

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
