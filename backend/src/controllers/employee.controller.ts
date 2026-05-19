import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import Employee from '../models/Employee';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

// ─── List ─────────────────────────────────────────────────────────────────────
export async function listEmployees(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.user!.organisationId;
    const { department, page = '1', limit = '20' } = req.query as Record<string, string>;
    const filter: any = { organisationId: orgId };
    if (department) filter.department = department;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [employees, total] = await Promise.all([
      Employee.find(filter).skip(skip).limit(parseInt(limit)).lean(),
      Employee.countDocuments(filter),
    ]);

    res.json({ data: employees, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
}

// ─── Get One ──────────────────────────────────────────────────────────────────
export async function getEmployee(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const emp = await Employee.findOne({ _id: req.params.id, organisationId: req.user!.organisationId });
    if (!emp) throw new AppError('Employee not found', 404, 'NOT_FOUND');
    res.json(emp);
  } catch (err) { next(err); }
}

// ─── Create ───────────────────────────────────────────────────────────────────
export async function createEmployee(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, department, baseSalary, joiningDate, bankAccount } = req.body;
    if (!name || !email || !department || !baseSalary) {
      throw new AppError('name, email, department and baseSalary are required', 400, 'VALIDATION_ERROR');
    }
    const existing = await Employee.findOne({ email, organisationId: req.user!.organisationId });
    if (existing) throw new AppError('Employee with this email already exists', 409, 'DUPLICATE');

    const emp = await Employee.create({
      name, email, department, baseSalary,
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      bankAccount,
      organisationId: req.user!.organisationId,
    });
    logger.info('Employee created', { empId: emp._id, orgId: req.user!.organisationId });
    res.status(201).json(emp);
  } catch (err) { next(err); }
}

// ─── Update ───────────────────────────────────────────────────────────────────
export async function updateEmployee(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const emp = await Employee.findOneAndUpdate(
      { _id: req.params.id, organisationId: req.user!.organisationId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!emp) throw new AppError('Employee not found', 404, 'NOT_FOUND');
    res.json(emp);
  } catch (err) { next(err); }
}

// ─── Delete ───────────────────────────────────────────────────────────────────
export async function deleteEmployee(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const emp = await Employee.findOneAndDelete({ _id: req.params.id, organisationId: req.user!.organisationId });
    if (!emp) throw new AppError('Employee not found', 404, 'NOT_FOUND');
    logger.info('Employee deleted', { empId: req.params.id });
    res.json({ message: 'Employee deleted' });
  } catch (err) { next(err); }
}

// ─── Add Monthly Adjustment ──────────────────────────────────────────────────
export async function addAdjustment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { month, type, amount, reason } = req.body;
    if (!month || !type || amount === undefined) {
      throw new AppError('month, type and amount are required', 400, 'VALIDATION_ERROR');
    }
    const validTypes = ['bonus', 'deduction', 'overtime', 'leave'];
    if (!validTypes.includes(type)) {
      throw new AppError(`type must be one of: ${validTypes.join(', ')}`, 400, 'VALIDATION_ERROR');
    }

    const emp = await Employee.findOneAndUpdate(
      { _id: req.params.id, organisationId: req.user!.organisationId },
      { $push: { monthlyAdjustments: { month, type, amount, reason } } },
      { new: true }
    );
    if (!emp) throw new AppError('Employee not found', 404, 'NOT_FOUND');
    res.json(emp);
  } catch (err) { next(err); }
}
