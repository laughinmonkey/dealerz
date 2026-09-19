import { Global, Module } from '@nestjs/common';
import { PinoLoggerService } from './pino-logger.service';

/**
 * Global logger module providing a structured Pino logger as the default
 * NestJS LoggerService. Imported once in AppModule, available everywhere.
 */
@Global()
@Module({
  providers: [
    {
      provide: PinoLoggerService,
      useFactory: () => new PinoLoggerService(),
    },
  ],
  exports: [PinoLoggerService],
})
export class LoggerModule {}
