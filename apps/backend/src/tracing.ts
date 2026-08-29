import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { IORedisInstrumentation } from '@opentelemetry/instrumentation-ioredis';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-node';

const exporterUrl = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';
const samplingRate = parseFloat(process.env.OTEL_SAMPLING_RATE || '0.1');

const exporter = new OTLPTraceExporter({ url: exporterUrl });
const sampler = new TraceIdRatioBasedSampler(samplingRate);

const sdk = new NodeSDK({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]: 'scoopdope-backend',
    [SEMRESATTRS_SERVICE_VERSION]: process.env.GIT_COMMIT_SHA || '0.0.0',
  }),
  traceExporter: exporter,
  sampler,
  instrumentations: [
    new HttpInstrumentation(),
    new PgInstrumentation(),
    new IORedisInstrumentation(),
  ],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().finally(() => process.exit(0));
});
