import { Module } from '@nestjs/common';
import { OutboxController } from './outbox.controller';
import { OutboxProcessorService } from './outbox-processor.service';
import { PrismaModule } from '@common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [OutboxController],
  providers: [OutboxProcessorService],
  exports: [OutboxProcessorService],
})
export class OutboxModule {}
