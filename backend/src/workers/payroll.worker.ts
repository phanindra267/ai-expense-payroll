import { parentPort, workerData } from 'worker_threads';

// This file runs in a separate V8 isolate (thread)
// It's used for parallelizing heavy CPU-bound tasks like processing 10,000+ payroll slips

function processPayrollBatch(employees: any[], taxRate: number) {
  const results = employees.map(emp => {
    // Simulate heavy calculation
    let gross = emp.baseSalary;
    for (let i=0; i<1000; i++) { gross += Math.random() * 0.01; } // Artificial load
    
    const tax = gross * taxRate;
    return {
      employeeId: emp.id,
      netPay: gross - tax,
      taxDeducted: tax
    };
  });
  
  return results;
}

if (parentPort) {
  const { batch, taxRate } = workerData;
  const processedBatch = processPayrollBatch(batch, taxRate);
  parentPort.postMessage(processedBatch);
}
