import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('WorkerBootstrap');

  try {
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['log', 'error', 'warn', 'debug', 'verbose'],
    });

    app.enableShutdownHooks();

    logger.log(`⚡ Mercantix Background Worker running [PID: ${process.pid}]`);
    logger.log('Listening for outbox events and periodic maintenance routines...');
  } catch (error) {
    logger.error('Failed to bootstrap worker service', error);
    process.exit(1);
  }
}

bootstrap();
