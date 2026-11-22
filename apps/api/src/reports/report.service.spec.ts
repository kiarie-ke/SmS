import { NotFoundException } from '@nestjs/common';
import { ReportsService } from './report.module';
import type { ReportSummaryRecord } from './report.repository';
import { ReportRepositoryPort } from './report.repository';

describe('ReportsService', () => {
  const record: ReportSummaryRecord = {
    term: {
      id: 'term-id',
      name: 'Term 2',
      academicYearId: 'year-id',
      startDate: new Date('2026-05-01T00:00:00.000Z'),
      endDate: new Date('2026-08-31T00:00:00.000Z'),
      academicYear: { name: '2026' },
    },
    totalStudents: 2,
    enrollment: [{ className: 'Grade 4', classLevel: 'G4', studentCount: 2 }],
    attendanceRecords: 2,
    attendanceRate: 50,
    attendance: [{ status: 'PRESENT', count: 1 }, { status: 'ABSENT', count: 1 }],
    marksRecorded: 1,
    averageScore: 72.5,
    academics: [{ grade: 'B', count: 1, averageScore: 72.5 }],
    cbcAssessments: [],
    publishedReportCards: 1,
    invoiceCount: 1,
    billedAmount: 1000,
    collectedAmount: 500,
    outstandingAmount: 500,
    fees: [{ status: 'PARTIAL', invoiceCount: 1, billedAmount: 1000 }],
  };
  let repository: jest.Mocked<Pick<ReportRepositoryPort, 'summary'>>;
  let service: ReportsService;

  beforeEach(() => {
    repository = { summary: jest.fn().mockResolvedValue(record) };
    service = new ReportsService(repository as ReportRepositoryPort);
  });

  it('formats the selected period and returns report sections', async () => {
    const result = await service.summary('term-id');

    expect(result.term).toEqual({
      id: 'term-id',
      name: 'Term 2',
      academicYearName: '2026',
      startDate: '2026-05-01',
      endDate: '2026-08-31',
    });
    expect(result.attendanceRate).toBe(50);
    expect(result.outstandingAmount).toBe(500);
  });

  it('rejects a requested term that does not exist', async () => {
    repository.summary.mockResolvedValue({ ...record, term: null });

    await expect(service.summary('missing-term')).rejects.toBeInstanceOf(NotFoundException);
  });
});
