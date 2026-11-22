import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MessageResponseDto } from '../auth/dto/auth-response.dto';
import { Roles } from '../common/decorators/roles.decorator';
import {
  SchoolSettingsDto,
  UpdateAcademicPeriodDto,
  UpdateSchoolSettingsDto,
} from './school-settings.dto';
import {
  SchoolSettingsRepository,
  SchoolSettingsRepositoryPort,
  type SchoolSettingsRecord,
} from './school-settings.repository';

function toDto(record: SchoolSettingsRecord): SchoolSettingsDto {
  return {
    id: record.id,
    name: record.name,
    motto: record.motto,
    county: record.county,
    subCounty: record.subCounty,
    type: record.type,
    category: record.category,
    levels: record.levels,
    gradeScaleType: record.gradeScaleType,
    phone: record.phone,
    email: record.email,
    address: record.address,
    principalName: record.principalName,
    nemisCode: record.nemisCode,
    knecCenterNumber: record.knecCenterNumber,
  };
}

@Injectable()
export class SchoolSettingsService {
  constructor(private readonly schools: SchoolSettingsRepositoryPort) {}

  async get(): Promise<SchoolSettingsDto> {
    const school = await this.schools.findDefault();
    if (!school) throw new NotFoundException('School settings not found');
    return toDto(school);
  }

  async update(dto: UpdateSchoolSettingsDto): Promise<SchoolSettingsDto> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('Provide at least one setting to update');
    }
    const school = await this.schools.findDefault();
    if (!school) throw new NotFoundException('School settings not found');
    return toDto(await this.schools.update(school.id, dto));
  }

  async setAcademicPeriod(dto: UpdateAcademicPeriodDto): Promise<{ message: string }> {
    const updated = await this.schools.setAcademicPeriod(dto.academicYearId, dto.termId);
    if (!updated) {
      throw new BadRequestException(
        'The selected term must exist and belong to the selected academic year',
      );
    }
    return { message: 'Current academic period updated' };
  }
}

@ApiTags('school-settings')
@ApiBearerAuth()
@Controller('school-settings')
@Roles('ADMIN')
export class SchoolSettingsController {
  constructor(private readonly settings: SchoolSettingsService) {}

  @Get()
  @ApiOkResponse({ type: SchoolSettingsDto })
  @ApiOperation({ summary: 'Get school identity and grading settings' })
  get() {
    return this.settings.get();
  }

  @Patch()
  @ApiOkResponse({ type: SchoolSettingsDto })
  @ApiOperation({ summary: 'Update school identity and grading settings' })
  update(@Body() dto: UpdateSchoolSettingsDto) {
    return this.settings.update(dto);
  }

  @Patch('academic-period')
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiOperation({ summary: 'Set the current academic year and one of its terms atomically' })
  setAcademicPeriod(@Body() dto: UpdateAcademicPeriodDto) {
    return this.settings.setAcademicPeriod(dto);
  }
}

@Module({
  controllers: [SchoolSettingsController],
  providers: [
    SchoolSettingsService,
    { provide: SchoolSettingsRepositoryPort, useClass: SchoolSettingsRepository },
  ],
})
export class SchoolSettingsModule {}
