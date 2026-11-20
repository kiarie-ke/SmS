import { ApiProperty } from '@nestjs/swagger';
import { CLASS_LEVELS, GENDERS, RELATIONSHIPS } from '@school-system/shared';
import type { StudentDetailRecord, StudentRecord } from '../student.types';

export class StudentGuardianDto {
  @ApiProperty() guardianId!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() phone!: string;
  @ApiProperty({ enum: RELATIONSHIPS }) relationship!: string;
  @ApiProperty() isPrimary!: boolean;
}

export class StudentDto {
  @ApiProperty() id!: string;
  @ApiProperty() admissionNumber!: string;
  @ApiProperty() upi!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty({ nullable: true, type: String }) middleName!: string | null;
  @ApiProperty() lastName!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty({ enum: GENDERS }) gender!: string;
  @ApiProperty({ example: '2013-04-12' }) dateOfBirth!: string;
  @ApiProperty() county!: string;
  @ApiProperty() subCounty!: string;
  @ApiProperty({ nullable: true, type: String }) photoUrl!: string | null;
  @ApiProperty({ nullable: true, type: String }) religion!: string | null;
  @ApiProperty() boardingStatus!: string;
  @ApiProperty() specialNeeds!: boolean;
  @ApiProperty() classId!: string;
  @ApiProperty() className!: string;
  @ApiProperty({ enum: CLASS_LEVELS }) classLevel!: string;
  @ApiProperty({ nullable: true, type: String }) streamId!: string | null;
  @ApiProperty({ nullable: true, type: String }) streamName!: string | null;
  @ApiProperty({ description: 'Number of linked guardians' }) guardianCount!: number;
  @ApiProperty() createdAt!: string;
}

export class StudentDetailDto extends StudentDto {
  @ApiProperty({ nullable: true, type: String }) birthCertificateNumber!: string | null;
  @ApiProperty({ nullable: true, type: String }) knecIndexNumber!: string | null;
  @ApiProperty({ nullable: true, type: String }) userId!: string | null;
  @ApiProperty({ type: [StudentGuardianDto] }) guardians!: StudentGuardianDto[];
}


export class ImportRowResultDto {
  @ApiProperty({ description: 'Spreadsheet row number (header is row 1)' })
  row!: number;

  @ApiProperty({ nullable: true, type: String })
  admissionNumber?: string;

  @ApiProperty()
  success!: boolean;

  @ApiProperty({ nullable: true, type: String, description: 'Why the row failed' })
  error?: string;
}

export class ImportStudentsResultDto {
  @ApiProperty() total!: number;
  @ApiProperty() imported!: number;
  @ApiProperty() failed!: number;
  @ApiProperty({ type: [ImportRowResultDto] }) rows!: ImportRowResultDto[];
}

export class PhotoUploadResultDto {
  @ApiProperty({ example: 'https://res.cloudinary.com/demo/image/upload/v1/school.jpg' })
  photoUrl!: string;
}

function fullName(record: StudentRecord): string {
  return [record.firstName, record.middleName, record.lastName]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(' ');
}

export function toStudentDto(record: StudentRecord): StudentDto {
  return {
    id: record.id,
    admissionNumber: record.admissionNumber,
    upi: record.upi,
    firstName: record.firstName,
    middleName: record.middleName,
    lastName: record.lastName,
    fullName: fullName(record),
    gender: record.gender,
    dateOfBirth: record.dateOfBirth.toISOString().slice(0, 10),
    county: record.county,
    subCounty: record.subCounty,
    photoUrl: record.photoUrl,
    religion: record.religion,
    boardingStatus: record.boardingStatus,
    specialNeeds: record.specialNeeds,
    classId: record.classId,
    className: record.class.name,
    classLevel: record.class.level,
    streamId: record.streamId,
    streamName: record.stream?.name ?? null,
    guardianCount: record._count.guardians,
    createdAt: record.createdAt.toISOString(),
  };
}

export function toStudentDetailDto(record: StudentDetailRecord): StudentDetailDto {
  return {
    ...toStudentDto(record),
    birthCertificateNumber: record.birthCertificateNumber,
    knecIndexNumber: record.knecIndexNumber,
    religion: record.religion,
    userId: record.userId,
    guardians: record.guardians.map((link) => ({
      guardianId: link.guardian.id,
      firstName: link.guardian.firstName,
      lastName: link.guardian.lastName,
      phone: link.guardian.phone,
      relationship: link.guardian.relationship,
      isPrimary: link.isPrimary,
    })),
  };
}
