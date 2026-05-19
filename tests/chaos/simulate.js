const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const GATEWAY_URL = 'http://localhost:8080/health';
const BACKEND_URL = 'http://localhost:3000/health';

async function checkHealth(url, name) {
  try {
    const start = Date.now();
    const res = await axios.get(url, { timeout: 2000 });
    const latency = Date.now() - start;
    console.log(`✅ [${name}] is UP. Latency: ${latency}ms`);
    return true;
  } catch (error) {
    console.log(`❌ [${name}] is DOWN or Timeout: ${error.message}`);
    return false;
  }
}

async function simulateChaos() {
  console.log('\n🔥 --- STARTING CHAOS ENGINEERING SIMULATION --- 🔥\n');

  console.log('1. Baseline Health Check');
  await checkHealth(GATEWAY_URL, 'API Gateway');
  await checkHealth(BACKEND_URL, 'Backend Service');

  console.log('\n2. Injecting Fault: Stopping Redis Container (Cache & Queue dependency)');
  try {
    await execPromise('docker stop ep-redis');
    console.log('-> Redis stopped successfully.');
  } catch (e) {
    console.log('-> Could not stop Redis (maybe it is not running via docker locally).');
  }

  console.log('\n3. Verifying System Resilience (Gateway should still respond)');
  // Wait a few seconds for services to realize redis is down
  await new Promise(r => setTimeout(r, 3000));
  
  const gatewayAlive = await checkHealth(GATEWAY_URL, 'API Gateway');
  if (gatewayAlive) {
    console.log('✅ PASS: API Gateway implements graceful fallback when Redis is unreachable.');
  } else {
    console.log('❌ FAIL: API Gateway crashed due to Redis dependency failure.');
  }

  console.log('\n4. Restoring System State');
  try {
    await execPromise('docker start ep-redis');
    console.log('-> Redis started successfully.');
  } catch (e) {}

  console.log('\n🔥 --- CHAOS SIMULATION COMPLETE --- 🔥\n');
}

simulateChaos();
