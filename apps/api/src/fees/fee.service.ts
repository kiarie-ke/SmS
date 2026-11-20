import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@school-system/shared';
import { FeeRepositoryPort, type FeeInvoiceRecord, type FeeStructureRecord } from './fee.repository';
import { ScopingService } from '../scoping/scoping.service';
import { StudentRepositoryPort } from '../people/students/student.repository';
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
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

export type FeeStructureDto = FeeStructureRecord;
export type FeeInvoiceDto = FeeInvoiceRecord;

function invoiceNumber(studentId: string, termId: string): string {
  return `INV-${termId.slice(0, 6)}-${studentId.slice(0, 6)}-${Date.now().toString().slice(-4)}`;
}

function recomputeStatus(total: number, paid: number): 'UNPAID' | 'PARTIAL' | 'PAID' {
  if (paid <= 0) return 'UNPAID';
  if (paid >= total - 0.001) return 'PAID';
  return 'PARTIAL';
}

@Injectable()
export class FeeService {
  constructor(
    private readonly repo: FeeRepositoryPort,
    private readonly scoping: ScopingService,
    private readonly students: StudentRepositoryPort,
  ) {}

  // structures
  async listStructures(q: FeeStructureQueryDto) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const { rows, total } = await this.repo.listStructures({ skip: (page - 1) * limit, take: limit, classId: q.classId, termId: q.termId });
    return { data: rows, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async createStructure(dto: CreateFeeStructureDto) {
    return this.repo.createStructure({ classId: dto.classId, termId: dto.termId, category: dto.category as any, amount: dto.amount, isMandatory: dto.isMandatory ?? true });
  }

  async updateStructure(id: string, dto: UpdateFeeStructureDto) {
    const existing = await this.repo.findStructureById(id);
    if (!existing) throw new NotFoundException('Fee structure not found');
    return this.repo.updateStructure(id, { category: dto.category as any, amount: dto.amount, isMandatory: dto.isMandatory });
  }

  async removeStructure(id: string) {
    const existing = await this.repo.findStructureById(id);
    if (!existing) throw new NotFoundException('Fee structure not found');
    await this.repo.removeStructure(id);
  }

  // invoices
  async listInvoices(q: FeeInvoiceQueryDto, userId: string, role: Role) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const params: any = { skip: (page - 1) * limit, take: limit, termId: q.termId, classId: q.classId, status: q.status };
    if (role === 'STUDENT') {
      const studentId = await this.scoping.studentIdForUser(userId);
      if (!studentId) throw new ForbiddenException('No student profile');
      params.studentId = studentId;
    } else if (role === 'PARENT') {
      const ids = await this.scoping.studentIdsForParent(userId);
      params.studentIds = ids;
      if (q.studentId && !ids.includes(q.studentId)) throw new ForbiddenException('Not your child');
      if (q.studentId) params.studentId = q.studentId;
    } else {
      if (q.studentId) params.studentId = q.studentId;
    }
    const { rows, total } = await this.repo.listInvoices(params);
    return { data: rows, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getInvoice(id: string, userId: string, role: Role) {
    const inv = await this.repo.findInvoiceById(id);
    if (!inv) throw new NotFoundException('Invoice not found');
    await this.assertInvoiceAccess(inv, userId, role);
    return inv;
  }

  async generateInvoices(dto: GenerateInvoicesDto, userId: string) {
    // sum structures for class+term
    const { rows: structures } = await this.repo.listStructures({ skip: 0, take: 1000, classId: dto.classId, termId: dto.termId });
    if (structures.length === 0) throw new BadRequestException('No fee structures for this class/term');
    const total = structures.reduce((s, f) => s + f.amount, 0);
    // students in class
    const { rows: students } = await this.students.list({ scope: { unrestricted: true, ids: [] }, classId: dto.classId, skip: 0, take: 10000, sortBy: 'lastName', sortOrder: 'asc' });
    const dueDate = dto.dueDate ? new Date(dto.dueDate) : new Date(Date.now() + 30 * 86400000);
    let generated = 0;
    for (const st of students) {
      const existing = await this.repo.findInvoiceByStudentTerm(st.id, dto.termId);
      if (existing) continue;
      await this.repo.createInvoice({ invoiceNumber: invoiceNumber(st.id, dto.termId), studentId: st.id, termId: dto.termId, totalAmount: total, dueDate });
      generated++;
    }
    return { generated, total };
  }

  async recordPayment(invoiceId: string, dto: RecordPaymentDto, userId: string) {
    const inv = await this.repo.findInvoiceById(invoiceId);
    if (!inv) throw new NotFoundException('Invoice not found');
    const paid = (inv.payments ?? []).reduce((s, p) => s + p.amount, 0) + dto.amount;
    await this.repo.createPayment({ invoiceId, amount: dto.amount, method: dto.method as any, mpesaReceiptNumber: dto.mpesaReceiptNumber ?? null, recordedByUserId: userId, paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date() });
    const status = recomputeStatus(inv.totalAmount, paid);
    return this.repo.updateInvoiceStatus(invoiceId, status as any);
  }

  async stkPush(invoiceId: string, dto: StkPushDto, userId: string, role: Role) {
    const inv = await this.repo.findInvoiceById(invoiceId);
    if (!inv) throw new NotFoundException('Invoice not found');
    await this.assertInvoiceAccess(inv, userId, role);
    const checkoutRequestId = `ws_CO_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const tx = await this.repo.createMpesaTransaction({ invoiceId, checkoutRequestId, amount: dto.amount, phoneNumber: dto.phoneNumber, status: 'PENDING' });
    // mock: auto-succeed after creation (simulate callback) — in real life Daraja calls callback
    setTimeout(() => {
      this.handleCallback({ Body: { stkCallback: { MerchantRequestID: 'mr', CheckoutRequestID: checkoutRequestId, ResultCode: 0, ResultDesc: 'Success', CallbackMetadata: { Item: [{ Name: 'MpesaReceiptNumber', Value: `MP${Date.now()}` }, { Name: 'Amount', Value: dto.amount }] } } } }).catch(() => {});
    }, 1500);
    return { checkoutRequestId, status: 'PENDING' };
  }

  async handleCallback(payload: any) {
    const cb = payload?.Body?.stkCallback;
    if (!cb) return { ok: false };
    const checkoutRequestId = cb.CheckoutRequestID;
    const tx = await this.repo.findMpesaByCheckout(checkoutRequestId);
    if (!tx) return { ok: false };
    const resultCode = cb.ResultCode;
    const resultDesc = cb.ResultDesc;
    let receipt: string | null = null;
    let amount: number | null = null;
    if (resultCode === 0) {
      const items = cb.CallbackMetadata?.Item ?? [];
      for (const it of items) {
        if (it.Name === 'MpesaReceiptNumber') receipt = String(it.Value);
        if (it.Name === 'Amount') amount = Number(it.Value);
      }
    }
    await this.repo.updateMpesaTransaction(checkoutRequestId, { resultCode, resultDesc, mpesaReceiptNumber: receipt, status: resultCode === 0 ? 'SUCCESS' : 'FAILED', rawPayload: payload });
    if (resultCode === 0 && tx.invoiceId) {
      const inv = await this.repo.findInvoiceById(tx.invoiceId);
      if (inv) {
        const amt = amount ?? tx.amount ?? 0;
        await this.repo.createPayment({ invoiceId: tx.invoiceId, amount: amt, method: 'MPESA' as any, mpesaReceiptNumber: receipt, recordedByUserId: null, paidAt: new Date() });
        const paid = (inv.payments ?? []).reduce((s, p) => s + p.amount, 0) + amt;
        const status = recomputeStatus(inv.totalAmount, paid);
        await this.repo.updateInvoiceStatus(tx.invoiceId, status as any);
      }
    }
    return { ok: true };
  }

  async statement(q: FeeStatementQueryDto, userId: string, role: Role) {
    const inv = await this.repo.findInvoiceByStudentTerm(q.studentId, q.termId);
    if (!inv) throw new NotFoundException('No invoice for this student/term');
    await this.assertInvoiceAccess(inv, userId, role);
    const payments = await this.repo.listPayments(inv.id);
    const paid = payments.reduce((s, p) => s + p.amount, 0);
    return { invoice: inv, payments, paid, balance: inv.totalAmount - paid };
  }

  private async assertInvoiceAccess(inv: FeeInvoiceRecord, userId: string, role: Role) {
    if (role === 'ADMIN' || role === 'TEACHER') return;
    if (role === 'STUDENT') {
      const sid = await this.scoping.studentIdForUser(userId);
      if (sid !== inv.studentId) throw new ForbiddenException('Not your invoice');
      return;
    }
    if (role === 'PARENT') {
      const ids = await this.scoping.studentIdsForParent(userId);
      if (!ids.includes(inv.studentId)) throw new ForbiddenException('Not your child');
      return;
    }
    throw new ForbiddenException('Forbidden');
  }

  // helper used by generateInvoices
  // (scoping exposes studentsInClass)
}