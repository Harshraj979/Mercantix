import {
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OutboxProcessorService } from './outbox-processor.service';
import { JwtAuthGuard, RolesGuard } from '@common/guards';
import { Roles } from '@common/decorators';
import { RoleName } from '@mercantix/contracts';

@ApiTags('Outbox (Admin)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN)
@Controller('admin/outbox')
export class OutboxController {
  constructor(private readonly outboxProcessor: OutboxProcessorService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Admin: Get outbox queue statistics',
    description:
      'Returns count of pending events, dead-letter events (exhausted retries), and total processed.',
  })
  async getStats() {
    return this.outboxProcessor.getOutboxStats();
  }

  @Post('flush')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin: Manually flush all pending outbox events',
    description:
      'Force-processes all unprocessed outbox events immediately without waiting for the next poll cycle.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Flush result with processed and failed counts',
    schema: {
      example: { processed: 12, failed: 1 },
    },
  })
  async flush() {
    return this.outboxProcessor.flushPendingEvents();
  }
}
