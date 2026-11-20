import { BadRequestException, Injectable } from '@nestjs/common';
import { GENDERS } from '@school-system/shared';
import Papa from 'papaparse';
import { StudentRepositoryPort } from './student.repository';
import type { StudentCreateData } from './student.types';
import type { ImportStudentsResultDto } from './dto/student-response.dto';

const REQUIRED_COLUMNS = [
  'admissionNumber',
  'upi',
  'firstName',
  'lastName',
  'gender',
  'dateOfBirth',
  'county',
  'subCounty',
];

const MAX_IMPORT_ROWS = 500;

interface RawRow {
  [column: string]: string | undefined;
}

/**
 * CSV student import. A bad row is reported, never thrown: one failure must
 * not abort the batch. Batch-level problems (missing columns, empty file,
 * too many rows) are rejected before any row is created.
 */
@Injectable()
export class StudentImportService {
  constructor(private readonly students: StudentRepositoryPort) {}

  async import(csv: Buffer): Promise<ImportStudentsResultDto> {
    const parsed = Papa.parse<RawRow>(csv.toString('utf8'), {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.replace(/^\uFEFF/, '').trim(),
    });

    const fields = parsed.meta.fields ?? [];
    const missing = REQUIRED_COLUMNS.filter((column) => !fields.includes(column));
    if (missing.length > 0) {
      throw new BadRequestException(
        `CSV is missing required column(s): ${missing.join(', ')}`,
      );
    }

    const rows = parsed.data.filter((row) =>
      Object.values(row).some((value) => (value ?? '').trim() !== ''),
    );
    if (rows.length === 0) {
      throw new BadRequestException('The CSV file has no data rows');
    }
    if (rows.length > MAX_IMPORT_ROWS) {
      throw new BadRequestException(
        `Import at most ${MAX_IMPORT_ROWS} rows at a time (received ${rows.length})`,
      );
    }

    const results: ImportStudentsResultDto['rows'] = [];
    const classCache = new Map<string, { id: string; name: string }>();

    for (let index = 0; index < rows.length; index++) {
      const raw = rows[index];
      const admissionNumber = raw.admissionNumber?.trim() || undefined;
      try {
        const data = await this.toCreateData(raw, classCache);
        await this.students.create(data);
        results.push({ row: index + 2, admissionNumber, success: true });
      } catch (error) {
        results.push({
          row: index + 2,
          admissionNumber,
          success: false,
          error: this.describe(error),
        });
      }
    }

    const imported = results.filter((result) => result.success).length;
    return {
      total: results.length,
      imported,
      failed: results.length - imported,
      rows: results,
    };
  }

  private async toCreateData(
    raw: RawRow,
    classCache: Map<string, { id: string; name: string }>,
  ): Promise<StudentCreateData> {
    const required = (column: string): string => {
      const value = raw[column]?.trim();
      if (!value) throw new BadRequestException(`Missing ${column}`);
      return value;
    };

    const gender = required('gender').toUpperCase();
    if (!(GENDERS as readonly string[]).includes(gender)) {
      throw new BadRequestException(`Unknown gender "${raw.gender}"`);
    }

    const dateOfBirth = required('dateOfBirth');
    if (Number.isNaN(Date.parse(dateOfBirth))) {
      throw new BadRequestException(`Invalid dateOfBirth "${dateOfBirth}"`);
    }

    const klass = await this.resolveClass(raw, classCache);

    const streamName = raw.streamName?.trim();
    let streamId: string | null = null;
    if (streamName) {
      const stream = await this.students.findStreamByName(klass.id, streamName);
      if (!stream) {
        throw new BadRequestException(
          `Unknown stream "${streamName}" in ${klass.name}`,
        );
      }
      streamId = stream.id;
    }

    const boardingStatus = (raw.boardingStatus?.trim().toUpperCase() ?? 'DAY') as
      | 'DAY'
      | 'BOARDER';
    if (boardingStatus !== 'DAY' && boardingStatus !== 'BOARDER') {
      throw new BadRequestException(`Unknown boardingStatus "${raw.boardingStatus}"`);
    }

    const specialNeeds = (raw.specialNeeds?.trim().toLowerCase() ?? '') === 'true';

    return {
      admissionNumber: required('admissionNumber'),
      upi: required('upi'),
      firstName: required('firstName'),
      lastName: required('lastName'),
      middleName: raw.middleName?.trim() || null,
      gender: gender as StudentCreateData['gender'],
      dateOfBirth: new Date(dateOfBirth),
      birthCertificateNumber: raw.birthCertificateNumber?.trim() || null,
      knecIndexNumber: raw.knecIndexNumber?.trim() || null,
      county: required('county'),
      subCounty: required('subCounty'),
      religion: raw.religion?.trim() || null,
      specialNeeds,
      boardingStatus,
      classId: klass.id,
      streamId,
    };
  }

  private async resolveClass(
    raw: RawRow,
    classCache: Map<string, { id: string; name: string }>,
  ): Promise<{ id: string; name: string }> {
    const classId = raw.classId?.trim();
    const className = raw.className?.trim();
    if (!classId && !className) {
      throw new BadRequestException('Provide classId or className');
    }

    const key = classId ? `id:${classId}` : `name:${className!.toLowerCase()}`;
    const cached = classCache.get(key);
    if (cached) return cached;

    const klass = classId
      ? await this.students.findClassById(classId)
      : await this.students.findClassByName(className!);
    if (!klass) {
      throw new BadRequestException(`Unknown class "${className ?? classId}"`);
    }
    classCache.set(key, klass);
    return klass;
  }

  private describe(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Unique constraint')) {
      return 'Duplicate admission number, UPI or KNEC index number';
    }
    if (message.startsWith('Missing ') || message.startsWith('Unknown ') || message.startsWith('Invalid ') || message.startsWith('Provide ')) {
      return message;
    }
    return 'Could not import this row';
  }
}
