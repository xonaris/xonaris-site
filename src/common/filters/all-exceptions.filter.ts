import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Global exception filter that prevents leaking internal details
 * (Prisma errors, stack traces, column names, etc.) to the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Erreur interne du serveur';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      message =
        typeof response === 'string'
          ? response
          : (response as any)?.message || response;
    } else {
      // Log unexpected errors server-side only
      console.error('[UnhandledException]', exception);
    }

    res.status(status).json({
      statusCode: status,
      message,
    });
  }
}
