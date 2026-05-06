// MUST be imported before any other module in main.ts so Sentry's
// auto-instrumentation can patch http/express/etc at require time.
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const dsn = process.env.SENTRY_DSN;
const isProd = process.env.NODE_ENV === 'production';

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    integrations: [nodeProfilingIntegration()],
    enableLogs: true,
    sendDefaultPii: true,
    // Sample 10% of traces in prod; everything in non-prod.
    tracesSampleRate: isProd ? 0.1 : 1.0,
    profileSessionSampleRate: isProd ? 0.1 : 1.0,
    profileLifecycle: 'trace',
  });
}
