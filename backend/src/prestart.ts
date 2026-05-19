import { execSync } from 'child_process';
import Module from 'module';

let isRedisRunning = false;
try {
  // Run a quick check to see if port 6379 is listening on Windows
  const output = execSync('netstat -ano', { stdio: 'pipe' }).toString();
  if (output.includes(':6379') && output.includes('LISTENING')) {
    isRedisRunning = true;
  }
} catch {
  isRedisRunning = false;
}

if (!isRedisRunning) {
  console.log('[Dev-Sandbox] Redis is offline. Activating in-memory Mock Redis & Queue services...');
  
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function (id: string) {
    if (id === 'ioredis') {
      return class MockRedis {
        constructor() {
          // Safe initialization
        }
        ping() { return Promise.resolve('PONG'); }
        on(event: string, cb: Function) {
          return this;
        }
        info() { return Promise.resolve(''); }
        quit() { return Promise.resolve('OK'); }
        disconnect() { return Promise.resolve('OK'); }
        zremrangebyscore() { return Promise.resolve(0); }
        zcard() { return Promise.resolve(0); }
        zrange() { return Promise.resolve([]); }
        zadd() { return Promise.resolve(0); }
        expire() { return Promise.resolve(0); }
      };
    }
    if (id === 'bullmq') {
      return {
        Queue: class MockQueue {
          add() { return Promise.resolve({ id: 'mock-job-id' }); }
          on() {}
          close() { return Promise.resolve(); }
        },
        Worker: class MockWorker {
          on() {}
          close() { return Promise.resolve(); }
        }
      };
    }
    return originalRequire.apply(this, arguments as any);
  };
} else {
  console.log('[Dev-Sandbox] Local Redis service detected. Connecting...');
}
