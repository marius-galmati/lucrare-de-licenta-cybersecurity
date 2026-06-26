import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal Server Error';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const rawMessage =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || exception.message;

      // În producție folosim textul generic al statusului HTTP pentru 4xx/5xx
      // pentru a evita expunerea rutelor sau a detaliilor despre framework
      if (process.env.NODE_ENV === 'production' && statusCode >= 400) {
        const STATUS_MESSAGES: Record<number, string> = {
          400: 'Bad Request',
          401: 'Unauthorized',
          403: 'Forbidden',
          404: 'Not Found',
          409: 'Conflict',
          429: 'Too Many Requests',
          500: 'Internal Server Error',
        };
        message = STATUS_MESSAGES[statusCode] || rawMessage;
      } else {
        message = rawMessage;
      }
    }

    // Înregistrăm detaliile complete ale erorii pe partea de server
    if (statusCode >= 500) {
      this.logger.error(
        `${statusCode} ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    // Normalizăm mesajele de tip array (provenite din ValidationPipe) la string
    if (Array.isArray(message)) {
      message =
        process.env.NODE_ENV === 'production'
          ? 'Validation failed'
          : message;
    }

    response.status(statusCode).json({
      statusCode,
      message,
    });
  }
}
