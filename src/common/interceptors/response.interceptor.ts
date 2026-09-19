import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { PinoLoggerService } from '../logger/pino-logger.service';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  private readonly logger = new PinoLoggerService();

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const start = Date.now();

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - start;

        this.logger.debug(
          {
            method: request.method,
            url: request.originalUrl,
            statusCode: response.statusCode,
            duration: `${duration}ms`,
            responseSize: this.estimateSize(data),
          },
          'Response',
        );
      }),
      map((data) => {
        // If the controller already returned our envelope, pass through
        if (data && data.success !== undefined && data.message !== undefined) {
          return data;
        }

        const message = this.getDefaultMessage(request.method, response.statusCode);

        // Detect service-returned paginated response: { data: [...], meta: {...} }
        if (data && typeof data === 'object' && 'data' in data && 'meta' in data) {
          return {
            success: true,
            message: message || 'Operation completed successfully.',
            data: data.data,
            meta: data.meta,
          };
        }

        const result: ApiResponse<T> = {
          success: true,
          message: message || 'Operation completed successfully.',
          data: Array.isArray(data) ? data : data ?? null,
        };

        if (request.paginationMeta) {
          result.meta = request.paginationMeta;
        }

        return result;
      }),
    );
  }

  private getDefaultMessage(method: string, statusCode: number): string {
    switch (method) {
      case 'GET':
        return 'Resource retrieved successfully.';
      case 'POST':
        return 'Resource created successfully.';
      case 'PATCH':
      case 'PUT':
        return 'Resource updated successfully.';
      case 'DELETE':
        return 'Resource deleted successfully.';
      default:
        return 'Operation completed successfully.';
    }
  }

  /**
   * Rough estimate of response size in bytes for observability.
   */
  private estimateSize(data: any): number {
    try {
      return Buffer.byteLength(JSON.stringify(data), 'utf8');
    } catch {
      return 0;
    }
  }
}
