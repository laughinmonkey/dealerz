import { Injectable, LoggerService } from '@nestjs/common';
import pino, { Logger as PinoLogger, LoggerOptions } from 'pino';

/**
 * Custom logger service backed by Pino for structured JSON logging.
 * Implements NestJS LoggerService so it can be used as a drop-in replacement.
 */
@Injectable()
export class PinoLoggerService implements LoggerService {
  private readonly pino: PinoLogger;

  constructor() {
    const options: LoggerOptions = {
      level: process.env.LOG_LEVEL || 'info',
      transport:
        process.env.NODE_ENV !== 'production'
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
      // Redact sensitive fields from logs
      redact: {
        paths: [
          'password',
          'passwordHash',
          'token',
          'refreshToken',
          'accessToken',
          'authorization',
          'cvv',
          'cardNumber',
          'ssn',
          'identityDocument',
        ],
        censor: '[REDACTED]',
      },
    };

    this.pino = pino(options);
  }

  log(message: any, context?: string): void;
  log(message: any, ...optionalParams: any[]): void;
  log(message: any, ...optionalParams: any[]): void {
    const { msg, context, data } = this.extractParams(message, optionalParams);
    this.pino.info(data || {}, `[${context}] ${msg}`);
  }

  error(message: any, trace?: string, context?: string): void;
  error(message: any, ...optionalParams: any[]): void;
  error(message: any, ...optionalParams: any[]): void {
    const { msg, context, data } = this.extractParams(message, optionalParams);

    if (data instanceof Error) {
      this.pino.error({ ...data, stack: data.stack }, `[${context}] ${msg}`);
    } else if (data?.err instanceof Error) {
      this.pino.error(
        { ...data, err: { message: data.err.message, stack: data.err.stack } },
        `[${context}] ${msg}`,
      );
    } else {
      this.pino.error(data || {}, `[${context}] ${msg}`);
    }
  }

  warn(message: any, context?: string): void;
  warn(message: any, ...optionalParams: any[]): void;
  warn(message: any, ...optionalParams: any[]): void {
    const { msg, context, data } = this.extractParams(message, optionalParams);
    this.pino.warn(data || {}, `[${context}] ${msg}`);
  }

  debug(message: any, context?: string): void;
  debug(message: any, ...optionalParams: any[]): void;
  debug(message: any, ...optionalParams: any[]): void {
    const { msg, context, data } = this.extractParams(message, optionalParams);
    this.pino.debug(data || {}, `[${context}] ${msg}`);
  }

  verbose(message: any, context?: string): void;
  verbose(message: any, ...optionalParams: any[]): void;
  verbose(message: any, ...optionalParams: any[]): void {
    const { msg, context, data } = this.extractParams(message, optionalParams);
    this.pino.trace(data || {}, `[${context}] ${msg}`);
  }

  // ─── Helpers ─────────────────────────────────────────────────

  private extractParams(
    message: any,
    optionalParams: any[],
  ): { msg: string; context: string; data?: Record<string, any> } {
    let msg = '';
    let context = 'Application';
    let data: Record<string, any> | undefined;

    if (typeof message === 'string') {
      msg = message;
    } else if (message && typeof message === 'object') {
      data = message;
      msg = data?.message || 'Log entry';
    }

    if (optionalParams.length > 0) {
      if (typeof optionalParams[0] === 'string') {
        context = optionalParams[0];
      } else if (optionalParams[0] && typeof optionalParams[0] === 'object') {
        data = { ...(data || {}), ...optionalParams[0] };
      }

      if (typeof optionalParams[1] === 'string') {
        context = optionalParams[1];
      } else if (optionalParams[1] && typeof optionalParams[1] === 'object') {
        data = { ...(data || {}), ...optionalParams[1] };
      }
    }

    return { msg, context, data };
  }

  /**
   * Returns a child logger with bound context.
   * Usage: `logger.child('AssetService')`
   */
  child(context: string): PinoLoggerService {
    const childLogger = new PinoLoggerService();
    (childLogger as any).pino = this.pino.child({ context });
    return childLogger;
  }
}
