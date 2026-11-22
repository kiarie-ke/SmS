import {
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import {
  ReportSummaryDto,
  ReportSummaryQueryDto,
} from './report.dto';
import {
  ReportRepository,
  ReportRepositoryPort,
} from './report.repository';

@Injectable()
export class ReportsService {
  constructor(private readonly reports: ReportRepositoryPort) {}

  async summary(termId?: string): Promise<ReportSummaryDto> {
    const record = await this.reports.summary(termId);
    if (termId && !record.term) throw new NotFoundException('Term not found');
    return {
      ...record,
      term: record.term
        ? {
            id: record.term.id,
            name: record.term.name,
            academicYearName: record.term.academicYear.name,
            startDate: record.term.startDate.toISOString().slice(0, 10),
            endDate: record.term.endDate.toISOString().slice(0, 10),
          }
        : null,
    };
  }
}

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('summary')
  @Roles('ADMIN')
  @ApiOkResponse({ type: ReportSummaryDto })
  @ApiOperation({ summary: 'Get school-wide enrollment, attendance, academic and fee reports' })
  summary(@Query() query: ReportSummaryQueryDto) {
    return this.reports.summary(query.termId);
  }
}

@Module({
  controllers: [ReportsController],
  providers: [
    ReportsService,
    { provide: ReportRepositoryPort, useClass: ReportRepository },
  ],
})
export class ReportsModule {}
