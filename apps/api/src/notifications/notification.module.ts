import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../common/auth-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MessageResponseDto } from '../auth/dto/auth-response.dto';
import { NotificationRepository, NotificationRepositoryPort } from './notification.repository';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly repo: NotificationRepositoryPort) {}

  @Get()
  @ApiOkResponse({ description: 'List my notifications' })
  @ApiOperation({ summary: 'List notifications for the current user' })
  async list(@CurrentUser() user: AuthenticatedUser, @Query('page') page = 1, @Query('limit') limit = 20) {
    const p = Number(page) || 1;
    const l = Number(limit) || 20;
    const { rows, total } = await this.repo.listForUser(user.id, (p - 1) * l, l);
    return { data: rows, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
  }

  @Get('unread-count')
  @ApiOkResponse({ description: 'Unread count' })
  @ApiOperation({ summary: 'Unread notification count' })
  count(@CurrentUser() user: AuthenticatedUser) {
    return this.repo.countUnread(user.id).then((count) => ({ count }));
  }

  @Patch(':id/read')
  @HttpCode(200)
  @ApiOkResponse({ description: 'Mark read' })
  @ApiOperation({ summary: 'Mark a notification as read' })
  async read(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    const r = await this.repo.markRead(id, user.id);
    if (!r) return { success: false, message: 'Not found' };
    return r;
  }

  @Post('read-all')
  @HttpCode(200)
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async readAll(@CurrentUser() user: AuthenticatedUser) {
    const count = await this.repo.markAllRead(user.id);
    return { success: true, message: `Marked ${count} as read` };
  }
}

@Module({
  controllers: [NotificationsController],
  providers: [{ provide: NotificationRepositoryPort, useClass: NotificationRepository }],
  exports: [NotificationRepositoryPort],
})
export class NotificationsModule {}
