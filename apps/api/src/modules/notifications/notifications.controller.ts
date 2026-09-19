import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import {
  NotificationQueryDto,
  NotificationResponseDto,
  NotificationSummaryResponseDto,
} from './dto';
import { JwtAuthGuard } from '@common/guards';
import { CurrentUser } from '@common/decorators';
import { JwtPayload } from '@mercantix/contracts';

@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get current user notifications (paginated)' })
  @ApiResponse({ status: HttpStatus.OK, type: [NotificationResponseDto] })
  async getNotifications(
    @CurrentUser() user: JwtPayload,
    @Query() query: NotificationQueryDto,
  ) {
    return this.notificationsService.getUserNotifications(user.sub, query);
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Get notification inbox summary (unread & total counts)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: NotificationSummaryResponseDto,
  })
  async getSummary(
    @CurrentUser() user: JwtPayload,
  ): Promise<NotificationSummaryResponseDto> {
    return this.notificationsService.getNotificationSummary(user.sub);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({ status: HttpStatus.OK, type: NotificationResponseDto })
  async markAsRead(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.markAsRead(user.sub, id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.markAllAsRead(user.sub);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  async deleteNotification(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.notificationsService.deleteNotification(user.sub, id);
  }
}
