import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import logger from '../../utils/logger';

const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
redis.on('error', () => {});

// Create a queue for heavy computations
export const hpcQueue = new Queue('hpc-jobs', { connection: redis });

// Example worker that routes jobs based on priority/type
const worker = new Worker('hpc-jobs', async (job: Job) => {
  logger.info(`Processing HPC Job: ${job.id} | Type: ${job.name}`);
  
  if (job.name === 'monte-carlo') {
    // In a real system, we would make an HTTP call to the Python hpc-service here
    logger.info(`Routing Monte Carlo simulation to GPU/HPC cluster for data:`, job.data);
    
    // Mock latency for simulation
    await new Promise(r => setTimeout(r, 2000));
    
    return { status: 'completed', result: 'simulation_done' };
  }
  
}, { connection: redis, concurrency: 5 });

worker.on('completed', job => logger.info(`HPC Job ${job.id} completed.`));
worker.on('failed', (job, err) => logger.error(`HPC Job ${job?.id} failed:`, err));
