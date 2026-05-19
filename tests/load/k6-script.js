import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp-up to 50 users over 30s
    { duration: '1m', target: 50 },   // Stay at 50 users for 1m
    { duration: '30s', target: 0 },   // Ramp-down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate must be less than 1%
  },
};

const BASE_URL = 'http://localhost:3000/api';

export default function () {
  // 1. Health check
  const resHealth = http.get(`${BASE_URL}/health`);
  check(resHealth, {
    'health check status is 200': (r) => r.status === 200,
  });

  // 2. We can simulate authenticating and requesting dashboard if we have a test user
  // (In a real load test, we'd pre-provision users and feed credentials from a JSON/CSV file)
  
  sleep(1);
}
