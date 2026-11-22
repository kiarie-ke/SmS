import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { MessageResponseDto } from '../auth/dto/auth-response.dto';
import { ScopingModule } from '../scoping/scoping.module';
import { StudentsModule } from '../people/students/students.module';
import { FeeRepository, FeeRepositoryPort } from './fee.repository';
import { FeeService } from './fee.service';
import {
  CreateFeeStructureDto,
  FeeInvoiceQueryDto,
  FeeStatementQueryDto,
  FeeStructureQueryDto,
  GenerateInvoicesDto,
  RecordPaymentDto,
  StkPushDto,
  UpdateFeeStructureDto,
} from './fee.dto';

@ApiTags('fees')
@ApiBearerAuth()
@Controller('fees')
export class FeesController {
  constructor(private readonly fees: FeeService) {}

  @Get('structures')
  @Roles('ADMIN', 'TEACHER', 'BURSAR')
  @ApiOkResponse({ description: 'List fee structures' })
  @ApiOperation({ summary: 'List fee structures' })
  listStructures(@Query() query: FeeStructureQueryDto) {
    return this.fees.listStructures(query);
  }

  @Post('structures')
  @Roles('ADMIN', 'BURSAR')
  @ApiCreatedResponse({ description: 'Create fee structure' })
  @ApiOperation({ summary: 'Create a fee structure' })
  createStructure(@Body() dto: CreateFeeStructureDto) {
    return this.fees.createStructure(dto);
  }

  @Patch('structures/:id')
  @Roles('ADMIN', 'BURSAR')
  @ApiOkResponse({ description: 'Update fee structure' })
  @ApiOperation({ summary: 'Update a fee structure' })
  updateStructure(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFeeStructureDto) {
    return this.fees.updateStructure(id, dto);
  }

  @Delete('structures/:id')
  // @Delete not imported as decorator? use Delete
  @Roles('ADMIN', 'BURSAR')
  @HttpCode(200)
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiOperation({ summary: 'Delete a fee structure' })
  removeStructure(@Param('id', ParseUUIDPipe) id: string) {
    return this.fees.removeStructure(id).then(() => ({ success: true, message: 'Deleted' }));
  }

  @Get('invoices')
  @Roles('ADMIN', 'TEACHER', 'STUDENT', 'PARENT', 'BURSAR')
  @ApiOkResponse({ description: 'List invoices' })
  @ApiOperation({ summary: 'List fee invoices (scoped)' })
  listInvoices(@CurrentUser() user: AuthenticatedUser, @Query() query: FeeInvoiceQueryDto) {
    return this.fees.listInvoices(query, user.id, user.role as any);
  }

  @Get('invoices/:id')
  @Roles('ADMIN', 'TEACHER', 'STUDENT', 'PARENT', 'BURSAR')
  @ApiOkResponse({ description: 'Get invoice' })
  @ApiOperation({ summary: 'Get a fee invoice' })
  getInvoice(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.fees.getInvoice(id, user.id, user.role as any);
  }

  @Post('invoices/generate')
  @Roles('ADMIN', 'TEACHER', 'BURSAR')
  @HttpCode(200)
  @ApiOkResponse({ description: 'Generate invoices' })
  @ApiOperation({ summary: 'Generate invoices for a class/term from fee structures' })
  generate(@Body() dto: GenerateInvoicesDto) {
    return this.fees.generateInvoices(dto, '');
  }

  @Post('invoices/:id/payments')
  @Roles('ADMIN', 'TEACHER', 'BURSAR')
  @HttpCode(200)
  @ApiOkResponse({ description: 'Record payment' })
  @ApiOperation({ summary: 'Record a payment against an invoice' })
  recordPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.fees.recordPayment(id, dto, user.id);
  }

  @Post('invoices/:id/stk-push')
  @Roles('ADMIN', 'TEACHER', 'STUDENT', 'PARENT')
  @HttpCode(200)
  @ApiOkResponse({ description: 'STK push initiated' })
  @ApiOperation({ summary: 'Initiate M-Pesa STK push for an invoice' })
  stkPush(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StkPushDto,
  ) {
    return this.fees.stkPush(id, dto, user.id, user.role as any);
  }

  @Get('statement')
  @Roles('ADMIN', 'TEACHER', 'STUDENT', 'PARENT')
  @ApiOkResponse({ description: 'Fee statement' })
  @ApiOperation({ summary: 'Fee statement for a student/term' })
  statement(@CurrentUser() user: AuthenticatedUser, @Query() query: FeeStatementQueryDto) {
    return this.fees.statement(query, user.id, user.role as any);
  }

  @Post('mpesa/callback')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'M-Pesa STK callback (public)' })
  callback(@Body() payload: any) {
    return this.fees.handleCallback(payload);
  }
}

@Module({
  imports: [ScopingModule, StudentsModule],
  controllers: [FeesController],
  providers: [FeeService, { provide: FeeRepositoryPort, useClass: FeeRepository }],
  exports: [FeeService, FeeRepositoryPort],
})
export class FeesModule {}