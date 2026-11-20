import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../common/auth-user';
import { paginate } from '../../common/pagination';
import type { PaginatedResult } from '../../common/api-response';
import { ScopingService } from '../../scoping/scoping.service';
import { StudentRepositoryPort } from './student.repository';
import { StudentImportService } from './student-import.service';
import { PhotoStorageService } from './photo-storage.service';
import {
  toStudentDetailDto,
  toStudentDto,
  type ImportStudentsResultDto,
  type StudentDetailDto,
  type StudentDto,
} from './dto/student-response.dto';
import type {
  CreateStudentDto,
  LinkGuardianDto,
  StudentQueryDto,
  UpdateStudentDto,
} from './dto/student-input.dto';
import type {
  StudentCreateData,
  StudentUpdateData,
} from './student.types';

@Injectable()
export class StudentsService {
  constructor(
    private readonly students: StudentRepositoryPort,
    private readonly scoping: ScopingService,
    private readonly importer: StudentImportService,
    private readonly photos: PhotoStorageService,
  ) {}

  async list(
    user: AuthenticatedUser,
    query: StudentQueryDto,
  ): Promise<PaginatedResult<StudentDto>> {
    const scope = await this.scoping.studentScope(user);
    const { rows, total } = await this.students.list({
      scope,
      skip: query.skip,
      take: query.limit,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      classId: query.classId,
      streamId: query.streamId,
      gender: query.gender,
    });
    return paginate(rows.map(toStudentDto), total, query);
  }

  async get(user: AuthenticatedUser, id: string): Promise<StudentDetailDto> {
    const record = await this.requireStudent(id);
    await this.scoping.assertStudent(user, id);
    return toStudentDetailDto(record);
  }

  async create(dto: CreateStudentDto): Promise<StudentDto> {
    await this.assertStreamInClass(dto.streamId, dto.classId);
    const record = await this.students.create(this.toCreateData(dto));
    return toStudentDto(record);
  }

  async update(id: string, dto: UpdateStudentDto): Promise<StudentDto> {
    const current = await this.requireStudent(id);
    const classId = dto.classId ?? current.classId;
    const streamId = dto.streamId !== undefined ? dto.streamId : current.streamId;
    await this.assertStreamInClass(streamId, classId);
    const record = await this.students.update(id, this.toUpdateData(dto));
    return toStudentDto(record);
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.requireStudent(id);
    await this.students.softDelete(id);
    return { message: 'Student archived' };
  }

  async linkGuardian(
    user: AuthenticatedUser,
    id: string,
    dto: LinkGuardianDto,
  ): Promise<StudentDetailDto> {
    await this.requireStudent(id);
    await this.students.linkGuardian(id, dto.guardianId, dto.isPrimary ?? false);
    return this.get(user, id);
  }

  async importCsv(file: Express.Multer.File | undefined): Promise<ImportStudentsResultDto> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Attach a CSV file in the "file" field');
    }
    return this.importer.import(file.buffer);
  }

  async uploadPhoto(
    user: AuthenticatedUser,
    id: string,
    file: Express.Multer.File | undefined,
  ): Promise<{ photoUrl: string }> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Attach an image in the "file" field');
    }
    await this.requireStudent(id);
    await this.scoping.assertStudent(user, id);

    const photoUrl = await this.photos.store(file, id);
    await this.students.setPhotoUrl(id, photoUrl);
    return { photoUrl };
  }

  /** A stream may only be used with the class that owns it. */
  private async assertStreamInClass(
    streamId: string | null | undefined,
    classId: string,
  ): Promise<void> {
    if (!streamId) return;
    const stream = await this.students.findStreamById(streamId);
    if (!stream) throw new BadRequestException('Stream not found');
    if (stream.classId !== classId) {
      throw new BadRequestException(
        'The selected stream does not belong to the selected class',
      );
    }
  }

  private async requireStudent(id: string) {
    const record = await this.students.findById(id);
    if (!record || record.isDeleted) {
      throw new NotFoundException('Student not found');
    }
    return record;
  }

  private toCreateData(dto: CreateStudentDto): StudentCreateData {
    return {
      admissionNumber: dto.admissionNumber.trim(),
      upi: dto.upi.trim(),
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      middleName: dto.middleName?.trim() || null,
      gender: dto.gender,
      dateOfBirth: new Date(dto.dateOfBirth),
      birthCertificateNumber: dto.birthCertificateNumber?.trim() || null,
      knecIndexNumber: dto.knecIndexNumber?.trim() || null,
      county: dto.county.trim(),
      subCounty: dto.subCounty.trim(),
      religion: dto.religion?.trim() || null,
      specialNeeds: dto.specialNeeds ?? false,
      boardingStatus: dto.boardingStatus ?? 'DAY',
      classId: dto.classId,
      streamId: dto.streamId ?? null,
      photoUrl: dto.photoUrl ?? null,
    };
  }

  private toUpdateData(dto: UpdateStudentDto): StudentUpdateData {
    const data: StudentUpdateData = {};
    if (dto.admissionNumber !== undefined) data.admissionNumber = dto.admissionNumber.trim();
    if (dto.upi !== undefined) data.upi = dto.upi.trim();
    if (dto.firstName !== undefined) data.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) data.lastName = dto.lastName.trim();
    if (dto.middleName !== undefined) data.middleName = dto.middleName?.trim() || null;
    if (dto.gender !== undefined) data.gender = dto.gender;
    if (dto.dateOfBirth !== undefined) data.dateOfBirth = new Date(dto.dateOfBirth);
    if (dto.birthCertificateNumber !== undefined) {
      data.birthCertificateNumber = dto.birthCertificateNumber?.trim() || null;
    }
    if (dto.knecIndexNumber !== undefined) {
      data.knecIndexNumber = dto.knecIndexNumber?.trim() || null;
    }
    if (dto.county !== undefined) data.county = dto.county.trim();
    if (dto.subCounty !== undefined) data.subCounty = dto.subCounty.trim();
    if (dto.religion !== undefined) data.religion = dto.religion?.trim() || null;
    if (dto.specialNeeds !== undefined) data.specialNeeds = dto.specialNeeds;
    if (dto.boardingStatus !== undefined) data.boardingStatus = dto.boardingStatus;
    if (dto.classId !== undefined) data.classId = dto.classId;
    if (dto.streamId !== undefined) data.streamId = dto.streamId;
    if (dto.photoUrl !== undefined) data.photoUrl = dto.photoUrl;
    return data;
  }
}
