import {
  Body,
  Controller,
  Get,
  HttpCode,
  Injectable,
  Module,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../common/auth-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { MessageResponseDto } from '../auth/dto/auth-response.dto';
import { ScopingModule } from '../scoping/scoping.module';
import { StudentsModule } from '../people/students/students.module';
import { StudentRepositoryPort } from '../people/students/student.repository';
import { ExamsModule } from '../exams/exam.module';
import { ExamRepositoryPort } from '../exams/exam.repository';
import { CbcModule } from '../cbc/cbc.module';
import { CbcRepositoryPort } from '../cbc/cbc.repository';
import { ReportCardRepository, ReportCardRepositoryPort } from './report-card.repository';
import {
  GenerateReportCardsDto,
  ReportCardDto,
  ReportCardQueryDto,
  UpdateReportCardDto,
} from './report-card.dto';
import { ReportCardsService } from './report-card.service';

@ApiTags('report-cards')
@ApiBearerAuth()
@Controller('report-cards')
export class ReportCardsController {
  constructor(private readonly cards: ReportCardsService) {}

  @Get()
  @Roles('ADMIN', 'TEACHER', 'STUDENT', 'PARENT')
  @ApiOkResponse({ type: ReportCardDto, isArray: true })
  @ApiOperation({ summary: 'List report cards (scoped)' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportCardQueryDto) {
    return this.cards.list(user, query);
  }

  @Get(':id')
  @Roles('ADMIN', 'TEACHER', 'STUDENT', 'PARENT')
  @ApiOkResponse({ type: ReportCardDto })
  @ApiOperation({ summary: 'Get a report card with computed details' })
  get(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.cards.get(user, id);
  }

  @Post('generate')
  @Roles('ADMIN', 'TEACHER')
  @HttpCode(200)
  @ApiOkResponse({ description: 'Generation result' })
  @ApiOperation({ summary: 'Generate report cards for a class/term' })
  generate(@CurrentUser() user: AuthenticatedUser, @Body() dto: GenerateReportCardsDto) {
    return this.cards.generate(user, dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'TEACHER')
  @ApiOkResponse({ type: ReportCardDto })
  @ApiOperation({ summary: 'Update comments on a report card' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReportCardDto,
  ) {
    return this.cards.update(user, id, dto);
  }

  @Post(':id/publish')
  @Roles('ADMIN', 'TEACHER')
  @HttpCode(200)
  @ApiOkResponse({ type: ReportCardDto })
  @ApiOperation({ summary: 'Publish a report card' })
  publish(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.cards.publish(user, id);
  }

  @Post(':id/unpublish')
  @Roles('ADMIN')
  @HttpCode(200)
  @ApiOkResponse({ type: ReportCardDto })
  @ApiOperation({ summary: 'Unpublish a report card' })
  unpublish(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.cards.unpublish(user, id);
  }
}

@Module({
  imports: [ScopingModule, StudentsModule, ExamsModule, CbcModule],
  controllers: [ReportCardsController],
  providers: [
    ReportCardsService,
    { provide: ReportCardRepositoryPort, useClass: ReportCardRepository },
    // ExamRepositoryPort and CbcRepositoryPort and StudentRepositoryPort are provided by imported modules? Need to ensure they're exported.
  ],
})
export class ReportCardsModule {}
