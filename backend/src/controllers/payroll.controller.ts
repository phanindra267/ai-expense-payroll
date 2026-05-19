import { Response, NextFunction } from 'express';
import { Worker } from 'worker_threads';
import path from 'path';
import PDFDocument from 'pdfkit';
import { AuthRequest } from '../middleware/auth';
import Payroll from '../models/Payroll';
import Employee from '../models/Employee';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

// ─── Calculate net pay ────────────────────────────────────────────────────────
function calculateNet(emp: any, month: string): { totalBonuses: number; totalDeductions: number; overtimePay: number; leaveDeductions: number; netPay: number } {
  const adjustments = (emp.monthlyAdjustments || []).filter((a: any) => a.month === month);
  const totalBonuses = adjustments.filter((a: any) => a.type === 'bonus').reduce((s: number, a: any) => s + a.amount, 0);
  const totalDeductions = adjustments.filter((a: any) => a.type === 'deduction').reduce((s: number, a: any) => s + a.amount, 0);
  const overtimePay = adjustments.filter((a: any) => a.type === 'overtime').reduce((s: number, a: any) => s + a.amount, 0);
  const leaveDeductions = adjustments.filter((a: any) => a.type === 'leave').reduce((s: number, a: any) => s + a.amount, 0);
  const netPay = emp.baseSalary + totalBonuses + overtimePay - totalDeductions - leaveDeductions;
  return { totalBonuses, totalDeductions, overtimePay, leaveDeductions, netPay };
}

// ─── Process Payroll ──────────────────────────────────────────────────────────
export async function processPayroll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { month } = req.body;
    if (!month) throw new AppError('month is required (YYYY-MM)', 400, 'VALIDATION_ERROR');
    const orgId = req.user!.organisationId;

    // Duplicate processing guard: check if payroll is already approved or paid for this month
    const existingFinalized = await Payroll.findOne({
      month,
      organisationId: orgId,
      status: { $in: ['approved', 'paid'] }
    });
    if (existingFinalized) {
      throw new AppError(`Payroll for ${month} is already finalized (Status: ${existingFinalized.status}). Re-processing is blocked.`, 400, 'PAYROLL_ALREADY_PROCESSED');
    }

    const employees = await Employee.find({ organisationId: orgId }).lean();
    if (employees.length === 0) throw new AppError('No employees found', 404, 'NOT_FOUND');

    const payrolls = await Promise.all(employees.map(async (emp: any) => {
      const calc = calculateNet(emp, month);
      return Payroll.findOneAndUpdate(
        { employeeId: emp._id, month, organisationId: orgId },
        {
          $set: {
            ...calc,
            baseSalary: emp.baseSalary,
            employeeName: emp.name,
            processedBy: req.user!.userId,
            status: 'draft',
            organisationId: orgId
          },
          $push: {
            auditLog: {
              fromStatus: 'none',
              toStatus: 'draft',
              changedBy: req.user!.userId,
              changedAt: new Date()
            }
          }
        },
        { upsert: true, new: true }
      );
    }));

    logger.info('Payroll processed', { month, count: payrolls.length, orgId });
    res.status(201).json({ month, count: payrolls.length, payrolls });
  } catch (err) { next(err); }
}

// ─── Update Status ────────────────────────────────────────────────────────────
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['audited'],
  audited: ['approved'],
  approved: ['paid'],
};

export async function updatePayrollStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status } = req.body;
    const payroll = await Payroll.findOne({ _id: req.params.id, organisationId: req.user!.organisationId });
    if (!payroll) throw new AppError('Payroll record not found', 404, 'NOT_FOUND');

    const allowed = VALID_TRANSITIONS[payroll.status] || [];
    if (!allowed.includes(status)) {
      throw new AppError(`Invalid transition: ${payroll.status} → ${status}`, 400, 'INVALID_TRANSITION');
    }

    const oldStatus = payroll.status;
    payroll.status = status;
    payroll.auditLog.push({
      fromStatus: oldStatus,
      toStatus: status,
      changedBy: req.user!.userId as any,
      changedAt: new Date()
    });
    await payroll.save();
    res.json(payroll);
  } catch (err) { next(err); }
}

// ─── List Payrolls ────────────────────────────────────────────────────────────
export async function listPayrolls(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { month, status } = req.query as Record<string, string>;
    const filter: any = { organisationId: req.user!.organisationId };
    if (month) filter.month = month;
    if (status) filter.status = status;
    const payrolls = await Payroll.find(filter).populate('employeeId', 'name email department').lean();
    res.json(payrolls);
  } catch (err) { next(err); }
}

// ─── Salary Slip PDF ─────────────────────────────────────────────────────────
export async function getSalarySlip(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const payroll = await Payroll.findOne({ _id: req.params.id, organisationId: req.user!.organisationId })
      .populate<{ employeeId: any }>('employeeId', 'name email department');
    if (!payroll) throw new AppError('Payroll record not found', 404, 'NOT_FOUND');

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=salary-slip-${payroll.month}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).font('Helvetica-Bold').text('SALARY SLIP', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).font('Helvetica');
    doc.text(`Employee: ${payroll.employeeId?.name || 'N/A'}`);
    doc.text(`Department: ${payroll.employeeId?.department || 'N/A'}`);
    doc.text(`Month: ${payroll.month}`);
    doc.text(`Status: ${payroll.status.toUpperCase()}`);
    doc.moveDown();
    doc.text('─'.repeat(60));
    doc.text(`Base Salary:       ₹${payroll.baseSalary.toFixed(2)}`);
    doc.text(`Bonuses:           ₹${payroll.totalBonuses.toFixed(2)}`);
    doc.text(`Overtime:          ₹${payroll.overtimePay.toFixed(2)}`);
    doc.text(`Deductions:       -₹${payroll.totalDeductions.toFixed(2)}`);
    doc.text(`Leave Deductions: -₹${payroll.leaveDeductions.toFixed(2)}`);
    doc.text('─'.repeat(60));
    doc.font('Helvetica-Bold').text(`Net Pay:           ₹${payroll.netPay.toFixed(2)}`);
    doc.end();
  } catch (err) { next(err); }
}
