import { jest } from '@jest/globals';

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    return {
      ping: (jest.fn() as any).mockResolvedValue('PONG'),
      on: jest.fn(),
      info: (jest.fn() as any).mockResolvedValue(''),
      quit: (jest.fn() as any).mockResolvedValue('OK'),
      disconnect: (jest.fn() as any).mockResolvedValue('OK'),
    };
  });
});

jest.mock('bullmq', () => {
  return {
    Queue: jest.fn().mockImplementation(() => {
      return {
        add: (jest.fn() as any).mockResolvedValue({ id: 'job-id' }),
        on: jest.fn(),
        close: jest.fn(),
      };
    }),
    Worker: jest.fn().mockImplementation(() => {
      return {
        on: jest.fn(),
        close: jest.fn(),
      };
    }),
  };
});
