import { Injectable, LoggerService, Scope } from '@nestjs/common';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Inject } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class CustomLoggerService implements LoggerService {
  private context?: string;

  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  setContext(context: string): void {
    this.context = context;
  }

  log(message: any, context?: string, meta?: any): void {
    this.logger.info(message, { context: context || this.context, ...meta });
  }

  error(message: any, trace?: string, context?: string): void {
    this.logger.error(message, {
      context: context || this.context,
      trace,
    });
  }

  warn(message: any, context?: string): void {
    this.logger.warn(message, { context: context || this.context });
  }

  debug(message: any, context?: string): void {
    this.logger.debug(message, { context: context || this.context });
  }

  verbose(message: any, context?: string): void {
    this.logger.verbose(message, { context: context || this.context });
  }

  // Additional Winston-specific methods
  info(message: any, context?: string, meta?: any): void {
    this.logger.info(message, { context: context || this.context, ...meta });
  }

  // Create child logger with context
  child(context: string): CustomLoggerService {
    const childLogger = new CustomLoggerService(this.logger);
    childLogger.setContext(context);
    return childLogger;
  }
}
