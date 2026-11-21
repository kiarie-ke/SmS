import { Controller, Get, Query, Global } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditRepository, AuditRepositoryPort } from './audit.repository';
import { AuditLogDto } from './audit.dto';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private readonly repo: AuditRepositoryPort) {}

  @Get()
  @Roles('ADMIN')
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'entityType', required: false, type: String })
  @ApiOkResponse({ type: AuditLogDto, isArray: true })
  @ApiOperation({ summary: 'List audit logs (admin)' })
  async list(@Query('page') page = 1, @Query('limit') limit = 50, @Query('entityType') entityType?: string) {
    const p = Number(page) || 1;
    const l = Number(limit) || 50;
    const { rows, total } = await this.repo.list((p - 1) * l, l, entityType);
    return {
      data: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
      meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) },
    };
  }
}

@Global()
@Module({
  controllers: [AuditController],
  providers: [{ provide: AuditRepositoryPort, useClass: AuditRepository }],
  exports: [AuditRepositoryPort],
})
export class AuditModule {}
