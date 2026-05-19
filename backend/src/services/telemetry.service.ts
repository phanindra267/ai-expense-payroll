import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

let sdk: NodeSDK | null = null;

export function initTelemetry(): void {
  const isEnabled = process.env.OTEL_ENABLED === 'true';
  if (!isEnabled) {
    console.log('[Telemetry] OpenTelemetry disabled');
    return;
  }

  const exporterType = process.env.OTEL_EXPORTER || 'console';

  let traceExporter;
  if (exporterType === 'jaeger' || exporterType === 'otlp') {
    traceExporter = new OTLPTraceExporter({
      url: process.env.JAEGER_ENDPOINT || 'http://localhost:4318/v1/traces',
    });
  } else {
    traceExporter = new ConsoleSpanExporter();
  }

  sdk = new NodeSDK({
    resource: new Resource({
      [SEMRESATTRS_SERVICE_NAME]: 'expense-payroll-api',
      [SEMRESATTRS_SERVICE_VERSION]: '8.0.0',
    }),
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-dns': { enabled: false },
      }),
    ],
  });

  sdk.start();
  console.log('[Telemetry] OpenTelemetry initialized with exporter:', exporterType);

  process.on('SIGTERM', () => {
    sdk?.shutdown().then(
      () => console.log('[Telemetry] Shut down successfully'),
      (err) => console.error('[Telemetry] Shutdown error', err)
    );
  });
}

export function shutdownTelemetry(): Promise<void> {
  if (sdk) {
    return sdk.shutdown();
  }
  return Promise.resolve();
}
