import { NotFoundException } from '@nestjs/common';
import { ScopingRepositoryPort } from '../scoping/scoping.repository';
import { ScopingService } from '../scoping/scoping.service';
import { StudentRepositoryPort } from '../people/students/student.repository';
import { FeeRepositoryPort, type FeeInvoiceRecord, type FeeStructureRecord } from './fee.repository';
import { FeeService } from './fee.service';

class FakeScopingRepository extends ScopingRepositoryPort {
  async findTeacherIdByUserId() { return 'teacher-1'; }
  async findGuardianIdByUserId() { return null; }
  async findStudentIdByUserId() { return null; }
  async findStudentIdsForTeacher() { return ['s1']; }
  async findStudentIdsForGuardian() { return []; }
  async findClassIdsForTeacher() { return ['c1']; }
  async findClassIdsForStudents() { return ['c1']; }
}

class FakeStudentRepository extends StudentRepositoryPort {
  async list() {
    return {
      rows: [
        { id: 's1', firstName: 'Brian', lastName: 'Otieno', admissionNumber: '1001', classId: 'c1', isDeleted: false } as any,
        { id: 's2', firstName: 'Faith', lastName: 'Wanjiku', admissionNumber: '1002', classId: 'c1', isDeleted: false } as any,
      ],
      total: 2,
    };
  }
  async findById(id: string) { return null; }
  async create(): Promise<any> { return null; }
  async update(): Promise<any> { return null; }
  async softDelete(): Promise<any> { return null; }
  async updatePhoto(): Promise<any> { return null; }
  async findExistingAdmissionNumbers(): Promise<string[]> { return []; }
  async findExistingUpis(): Promise<string[]> { return []; }
  async findGuardians(): Promise<any[]> { return []; }
  async linkGuardian(): Promise<any> { return null; }
  async unlinkGuardian(): Promise<void> {}
  async setPhotoUrl(): Promise<any> { return null; }
  async findClassById(): Promise<any> { return null; }
  async findClassByName(): Promise<any> { return null; }
  async findStreamByName(): Promise<any> { return null; }
  async findStreamById(): Promise<any> { return null; }
}

class FakeFeeRepository extends FeeRepositoryPort {
  public structures = new Map<string, FeeStructureRecord>();
  public invoices = new Map<string, FeeInvoiceRecord>();
  public payments: any[] = [];

  async listStructures() {
    const all = Array.from(this.structures.values());
    return { rows: all, total: all.length };
  }
  async findStructureById(id: string) { return this.structures.get(id) ?? null; }
  async createStructure(data: any): Promise<FeeStructureRecord> {
    const s: FeeStructureRecord = { id: `fs-${Date.now()}`, ...data, createdAt: new Date(), updatedAt: new Date() };
    this.structures.set(s.id, s);
    return s;
  }
  async updateStructure(id: string, data: any): Promise<FeeStructureRecord> {
    const existing = this.structures.get(id)!;
    const updated = { ...existing, ...data };
    this.structures.set(id, updated);
    return updated;
  }
  async removeStructure(id: string) { this.structures.delete(id); }
  async listStructuresForClassTerm(classId: string, termId: string) {
    return Array.from(this.structures.values()).filter((s) => s.classId === classId && s.termId === termId);
  }

  async listInvoices() {
    const all = Array.from(this.invoices.values());
    return { rows: all, total: all.length };
  }
  async findInvoiceById(id: string) { return this.invoices.get(id) ?? null; }
  async findInvoiceByStudentTerm(studentId: string, termId: string) {
    return Array.from(this.invoices.values()).find((i) => i.studentId === studentId && i.termId === termId) ?? null;
  }
  async createInvoice(data: any): Promise<FeeInvoiceRecord> {
    return this.upsertInvoice(data);
  }
  async upsertInvoice(data: any): Promise<FeeInvoiceRecord> {
    const key = `${data.studentId}-${data.termId}`;
    const inv: FeeInvoiceRecord = {
      id: `inv-${key}`,
      ...data,
      status: data.status ?? 'UNPAID',
      payments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.invoices.set(inv.id, inv);
    return inv;
  }
  async updateInvoiceStatus(id: string, status: any): Promise<FeeInvoiceRecord> {
    const existing = this.invoices.get(id)!;
    existing.status = status;
    return existing;
  }
  async createPayment(data: any): Promise<any> {
    const p = { id: `pay-${Date.now()}`, ...data };
    this.payments.push(p);
    const inv = this.invoices.get(data.invoiceId);
    if (inv) {
      inv.payments = inv.payments ?? [];
      inv.payments.push(p);
    }
    return p;
  }
  async listPayments(invoiceId: string): Promise<any[]> {
    return this.payments.filter((p) => p.invoiceId === invoiceId);
  }
  async createMpesaTransaction(): Promise<any> { return {}; }
  async findMpesaByCheckout(): Promise<any> { return null; }
  async updateMpesaTransaction(): Promise<any> { return {}; }
}

describe('FeeService', () => {
  let service: FeeService;
  let repo: FakeFeeRepository;
  let scoping: ScopingService;
  let students: FakeStudentRepository;

  beforeEach(() => {
    repo = new FakeFeeRepository();
    scoping = new ScopingService(new FakeScopingRepository());
    students = new FakeStudentRepository();
    service = new FeeService(repo, scoping, students);
  });

  it('creates fee structures and bulk generates invoices for a class', async () => {
    await service.createStructure({
      classId: 'c1',
      termId: 'term-1',
      category: 'TUITION',
      amount: 20000,
      isMandatory: true,
    });

    const res = await service.generateInvoices({ classId: 'c1', termId: 'term-1' }, 'admin-1');
    expect(res.generated).toBe(2);

    const invoices = await repo.listInvoices();
    expect(invoices.total).toBe(2);
    expect(invoices.rows[0].totalAmount).toBe(20000);
    expect(invoices.rows[0].status).toBe('UNPAID');
  });

  it('updates invoice status from UNPAID to PARTIAL to PAID on cash payments', async () => {
    await service.createStructure({
      classId: 'c1',
      termId: 'term-1',
      category: 'TUITION',
      amount: 20000,
      isMandatory: true,
    });
    await service.generateInvoices({ classId: 'c1', termId: 'term-1' }, 'admin-1');

    const invoices = await repo.listInvoices();
    const inv = invoices.rows[0];

    // Pay 5000 -> PARTIAL
    const resPartial = await service.recordPayment(inv.id, { amount: 5000, method: 'CASH' }, 'admin-1');
    expect(resPartial.status).toBe('PARTIAL');

    // Pay remaining 15000 -> PAID
    const resPaid = await service.recordPayment(inv.id, { amount: 15000, method: 'CASH' }, 'admin-1');
    expect(resPaid.status).toBe('PAID');
  });
});
