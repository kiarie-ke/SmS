import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
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
import { FinanceRepository, FinanceRepositoryPort } from './finance.repository';
import { FinanceService } from './finance.service';
import {
  CreateFinanceTransactionDto,
  FinanceSummaryQueryDto,
  FinanceTransactionQueryDto,
} from './finance.dto';
import {
  FinanceSummaryDto,
  FinanceTransactionDto,
} from './finance.response.dto';

@ApiTags('finance')
@ApiBearerAuth()
@Roles('ADMIN', 'BURSAR')
@Controller('finance')
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('transactions')
  @ApiOkResponse({ type: FinanceTransactionDto, isArray: true, description: 'List non-fee income and expense entries' })
  @ApiOperation({ summary: 'List finance transactions' })
  list(@Query() query: FinanceTransactionQueryDto) {
    return this.finance.list(query);
  }

  @Post('transactions')
  @ApiCreatedResponse({ type: FinanceTransactionDto, description: 'Record a non-fee income or expense' })
  @ApiOperation({ summary: 'Record a finance transaction' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFinanceTransactionDto,
  ) {
    return this.finance.create(user, dto);
  }

  @Get('summary')
  @ApiOkResponse({ type: FinanceSummaryDto, description: 'Income, expenses and net balance' })
  @ApiOperation({ summary: 'Get finance totals' })
  summary(@Query() query: FinanceSummaryQueryDto) {
    return this.finance.summary(query);
  }
}

@Module({
  controllers: [FinanceController],
  providers: [
    FinanceService,
    { provide: FinanceRepositoryPort, useClass: FinanceRepository },
  ],
})
export class FinanceModule {}
