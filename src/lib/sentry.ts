// Sentry is not currently configured.
// To enable error monitoring, install @sentry/browser, add VITE_SENTRY_DSN
// to your environment, and replace the stubs below.

export function initSentry() {
  // no-op
}

export const Sentry = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  captureException: (_err: unknown, _ctx?: any) => {},
}
