import mongoose from 'mongoose';
import logger from '../utils/logger';

interface MigrationRecord {
  name: string;
  appliedAt: Date;
}

const migrationSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  appliedAt: { type: Date, default: Date.now },
});

const MigrationModel = mongoose.model('Migration', migrationSchema);

// Migration definitions
const migrations: { name: string; up: () => Promise<void>; down: () => Promise<void> }[] = [
  {
    name: '20240101000001-initial-indexes',
    up: async () => {
      const db = mongoose.connection.db;
      if (!db) throw new Error('Database not connected');

      // Ensure indexes on expenses collection
      await db.collection('expenses').createIndex(
        { organisationId: 1, date: -1 },
        { background: true }
      );
      await db.collection('expenses').createIndex(
        { organisationId: 1, category: 1, date: 1 },
        { background: true }
      );
      await db.collection('expenses').createIndex(
        { organisationId: 1, flagged: 1 },
        { background: true }
      );
      await db.collection('expenses').createIndex(
        { description: 'text', vendor: 'text', category: 'text' },
        { background: true }
      );

      // Payroll indexes
      await db.collection('payrolls').createIndex(
        { organisationId: 1, month: 1, employeeId: 1 },
        { background: true }
      );
      await db.collection('payrolls').createIndex(
        { month: 1, status: 1 },
        { background: true }
      );

      // Budget indexes
      await db.collection('budgets').createIndex(
        { organisationId: 1, month: 1, category: 1 },
        { unique: true, background: true }
      );

      // Alert indexes
      await db.collection('alerts').createIndex(
        { organisationId: 1, createdAt: -1 },
        { background: true }
      );
      await db.collection('alerts').createIndex(
        { organisationId: 1, resolved: 1 },
        { background: true }
      );

      // JobLog indexes
      await db.collection('joblogs').createIndex(
        { jobId: 1 },
        { unique: true, background: true }
      );

      // IdempotencyRecord TTL index
      await db.collection('idempotencyrecords').createIndex(
        { createdAt: 1 },
        { expireAfterSeconds: 86400, background: true }
      );

      logger.info('Migration: Initial indexes created');
    },
    down: async () => {
      const db = mongoose.connection.db;
      if (!db) throw new Error('Database not connected');
      // Drop non-essential indexes (keep _id indexes)
      try { await db.collection('expenses').dropIndex('organisationId_1_date_-1'); } catch (e) { /* ignore */ }
      try { await db.collection('expenses').dropIndex('organisationId_1_category_1_date_1'); } catch (e) { /* ignore */ }
      logger.info('Migration: Initial indexes dropped');
    },
  },
  {
    name: '20240101000002-seed-categories',
    up: async () => {
      // Seed default expense categories as a reference document
      const db = mongoose.connection.db;
      if (!db) throw new Error('Database not connected');

      const defaultCategories = [
        'office_supplies', 'travel', 'meals', 'utilities', 'software',
        'hardware', 'marketing', 'rent', 'insurance', 'professional_services',
        'training', 'entertainment', 'telecommunications', 'shipping',
        'maintenance', 'miscellaneous',
      ];

      await db.collection('system_config').updateOne(
        { key: 'expense_categories' },
        {
          $set: {
            key: 'expense_categories',
            value: defaultCategories,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );

      logger.info('Migration: Default expense categories seeded');
    },
    down: async () => {
      const db = mongoose.connection.db;
      if (!db) throw new Error('Database not connected');
      await db.collection('system_config').deleteOne({ key: 'expense_categories' });
      logger.info('Migration: Default expense categories removed');
    },
  },
];

export async function runMigrations(): Promise<void> {
  try {
    // Ensure migration collection exists
    await MigrationModel.createCollection();

    const appliedMigrations = await MigrationModel.find({}).lean();
    const appliedNames = new Set(appliedMigrations.map((m: any) => m.name));

    for (const migration of migrations) {
      if (!appliedNames.has(migration.name)) {
        logger.info(`Running migration: ${migration.name}`);
        await migration.up();
        await MigrationModel.create({ name: migration.name });
        logger.info(`Migration completed: ${migration.name}`);
      } else {
        logger.info(`Migration already applied: ${migration.name}`);
      }
    }

    logger.info('All migrations completed');
  } catch (error) {
    logger.error('Migration failed', { error });
    throw error;
  }
}
