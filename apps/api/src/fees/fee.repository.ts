import { Injectable } from '@nestjs/common';
import { FeeCategory, InvoiceStatus, PaymentMethod } from '@school-system/shared';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type { FeeCategory, InvoiceStatus, PaymentMethod };

export interface FeeStructureRecord {
  id: string;
  classId: string;
  termId: string;
  category: FeeCategory;
  amount: number;
  isMandatory: boolean;
  createdAt: Date;
  updatedAt: Date;
  class?: { id: string; name: string; level: string } | null;
  term?: { id: string; name: string } | null;
}

export interface FeeInvoiceRecord {
  id: string;
  invoiceNumber: string;
  studentId: string;
  termId: string;
  totalAmount: number;
  status: InvoiceStatus;
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
  student?: { id: string; firstName: string; lastName: string; admissionNumber: string; classId: string } | null;
  term?: { id: string; name: string } | null;
  payments?: FeePaymentRecord[];
}

export interface FeePaymentRecord {
  id: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  mpesaReceiptNumber: string | null;
  paidAt: Date;
  recordedByUserId: string | null;
  createdAt: Date;
}

export interface MpesaTransactionRecord {
  id: string;
  invoiceId: string | null;
  merchantRequestId: string | null;
  checkoutRequestId: string;
  resultCode: number | null;
  resultDesc: string | null;
  mpesaReceiptNumber: string | null;
  amount: number | null;
  phoneNumber: string | null;
  status: string;
  rawPayload: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeeStructureListParams {
  skip: number;
  take: number;
  classId?: string;
  termId?: string;
}

export interface FeeStructureCreateData {
  classId: string;
  termId: string;
  category: FeeCategory;
  amount: number;
  isMandatory?: boolean;
}

export type FeeStructureUpdateData = Partial<Pick<FeeStructureCreateData, 'amount' | 'isMandatory' | 'category'>>;

export interface FeeInvoiceListParams {
  skip: number;
  take: number;
  studentId?: string;
  termId?: string;
  classId?: string;
  status?: InvoiceStatus;
  studentIds?: string[];
}

export interface FeePaymentCreateData {
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  mpesaReceiptNumber?: string | null;
  recordedByUserId: string | null;
  paidAt?: Date;
}

export abstract class FeeRepositoryPort {
  abstract listStructures(params: FeeStructureListParams): Promise<{ rows: FeeStructureRecord[]; total: number }>;
  abstract findStructureById(id: string): Promise<FeeStructureRecord | null>;
  abstract createStructure(data: FeeStructureCreateData): Promise<FeeStructureRecord>;
  abstract updateStructure(id: string, data: FeeStructureUpdateData): Promise<FeeStructureRecord>;
  abstract removeStructure(id: string): Promise<void>;

  abstract listInvoices(params: FeeInvoiceListParams): Promise<{ rows: FeeInvoiceRecord[]; total: number }>;
  abstract findInvoiceById(id: string): Promise<FeeInvoiceRecord | null>;
  abstract findInvoiceByStudentTerm(studentId: string, termId: string): Promise<FeeInvoiceRecord | null>;
  abstract createInvoice(data: { invoiceNumber: string; studentId: string; termId: string; totalAmount: number; dueDate: Date }): Promise<FeeInvoiceRecord>;
  abstract updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<FeeInvoiceRecord>;

  abstract createPayment(data: FeePaymentCreateData): Promise<FeePaymentRecord>;
  abstract listPayments(invoiceId: string): Promise<FeePaymentRecord[]>;

  abstract createMpesaTransaction(data: { invoiceId?: string | null; checkoutRequestId: string; merchantRequestId?: string | null; amount?: number | null; phoneNumber?: string | null; status?: string }): Promise<MpesaTransactionRecord>;
  abstract findMpesaByCheckout(checkoutRequestId: string): Promise<MpesaTransactionRecord | null>;
  abstract updateMpesaTransaction(checkoutRequestId: string, data: { resultCode?: number | null; resultDesc?: string | null; mpesaReceiptNumber?: string | null; status?: string; rawPayload?: unknown }): Promise<MpesaTransactionRecord>;
}

const fsInclude = {
  class: { select: { id: true, name: true, level: true } },
  term: { select: { id: true, name: true } },
} satisfies Prisma.FeeStructureInclude;

const invInclude = {
  student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true, classId: true } },
  term: { select: { id: true, name: true } },
  payments: true,
} satisfies Prisma.FeeInvoiceInclude;

@Injectable()
export class FeeRepository extends FeeRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listStructures(params: FeeStructureListParams) {
    const where: Prisma.FeeStructureWhereInput = {
      ...(params.classId ? { classId: params.classId } : {}),
      ...(params.termId ? { termId: params.termId } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.feeStructure.findMany({ where, orderBy: { createdAt: 'desc' }, skip: params.skip, take: params.take, include: fsInclude }),
      this.prisma.feeStructure.count({ where }),
    ]);
    return { rows: rows.map((r) => ({ ...r, amount: Number(r.amount) })) as unknown as FeeStructureRecord[], total };
  }

  async findStructureById(id: string) {
    const r = await this.prisma.feeStructure.findUnique({ where: { id }, include: fsInclude });
    return r ? ({ ...r, amount: Number(r.amount) } as unknown as FeeStructureRecord) : null;
  }

  async createStructure(data: FeeStructureCreateData) {
    const r = await this.prisma.feeStructure.create({ data: { ...data, amount: data.amount }, include: fsInclude });
    return { ...r, amount: Number(r.amount) } as unknown as FeeStructureRecord;
  }

  async updateStructure(id: string, data: FeeStructureUpdateData) {
    const r = await this.prisma.feeStructure.update({ where: { id }, data, include: fsInclude });
    return { ...r, amount: Number(r.amount) } as unknown as FeeStructureRecord;
  }

  async removeStructure(id: string) {
    await this.prisma.feeStructure.delete({ where: { id } });
  }

  async listInvoices(params: FeeInvoiceListParams) {
    const where: Prisma.FeeInvoiceWhereInput = {
      ...(params.studentId ? { studentId: params.studentId } : {}),
      ...(params.termId ? { termId: params.termId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.studentIds ? { studentId: { in: params.studentIds } } : {}),
      ...(params.classId ? { student: { classId: params.classId, isDeleted: false } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.feeInvoice.findMany({ where, orderBy: { createdAt: 'desc' }, skip: params.skip, take: params.take, include: invInclude }),
      this.prisma.feeInvoice.count({ where }),
    ]);
    return { rows: rows.map((r) => ({ ...r, totalAmount: Number(r.totalAmount), payments: (r.payments ?? []).map((p) => ({ ...p, amount: Number(p.amount) })) })) as unknown as FeeInvoiceRecord[], total };
  }

  async findInvoiceById(id: string) {
    const r = await this.prisma.feeInvoice.findUnique({ where: { id }, include: invInclude });
    if (!r) return null;
    return { ...r, totalAmount: Number(r.totalAmount), payments: (r.payments ?? []).map((p) => ({ ...p, amount: Number(p.amount) })) } as unknown as FeeInvoiceRecord;
  }

  async findInvoiceByStudentTerm(studentId: string, termId: string) {
    const r = await this.prisma.feeInvoice.findUnique({ where: { studentId_termId: { studentId, termId } }, include: invInclude });
    if (!r) return null;
    return { ...r, totalAmount: Number(r.totalAmount), payments: (r.payments ?? []).map((p) => ({ ...p, amount: Number(p.amount) })) } as unknown as FeeInvoiceRecord;
  }

  async createInvoice(data: { invoiceNumber: string; studentId: string; termId: string; totalAmount: number; dueDate: Date }) {
    const r = await this.prisma.feeInvoice.create({ data: { ...data, totalAmount: data.totalAmount }, include: invInclude });
    return { ...r, totalAmount: Number(r.totalAmount), payments: [] } as unknown as FeeInvoiceRecord;
  }

  async updateInvoiceStatus(id: string, status: InvoiceStatus) {
    const r = await this.prisma.feeInvoice.update({ where: { id }, data: { status }, include: invInclude });
    return { ...r, totalAmount: Number(r.totalAmount), payments: (r.payments ?? []).map((p) => ({ ...p, amount: Number(p.amount) })) } as unknown as FeeInvoiceRecord;
  }

  async createPayment(data: FeePaymentCreateData) {
    const r = await this.prisma.feePayment.create({ data: { ...data, amount: data.amount } });
    return { ...r, amount: Number(r.amount) } as unknown as FeePaymentRecord;
  }

  async listPayments(invoiceId: string) {
    const rows = await this.prisma.feePayment.findMany({ where: { invoiceId }, orderBy: { paidAt: 'desc' } });
    return rows.map((r) => ({ ...r, amount: Number(r.amount) })) as unknown as FeePaymentRecord[];
  }

  async createMpesaTransaction(data: { invoiceId?: string | null; checkoutRequestId: string; merchantRequestId?: string | null; amount?: number | null; phoneNumber?: string | null; status?: string }) {
    const r = await this.prisma.mpesaTransaction.create({ data: { ...data, status: data.status ?? 'PENDING' } });
    return { ...r, amount: r.amount !== null ? Number(r.amount) : null } as unknown as MpesaTransactionRecord;
  }

  async findMpesaByCheckout(checkoutRequestId: string) {
    const r = await this.prisma.mpesaTransaction.findUnique({ where: { checkoutRequestId } });
    if (!r) return null;
    return { ...r, amount: r.amount !== null ? Number(r.amount) : null } as unknown as MpesaTransactionRecord;
  }

  async updateMpesaTransaction(checkoutRequestId: string, data: { resultCode?: number | null; resultDesc?: string | null; mpesaReceiptNumber?: string | null; status?: string; rawPayload?: unknown }) {
    const r = await this.prisma.mpesaTransaction.update({ where: { checkoutRequestId }, data: { ...data, rawPayload: data.rawPayload as any } });
    return { ...r, amount: r.amount !== null ? Number(r.amount) : null } as unknown as MpesaTransactionRecord;
  }
}
