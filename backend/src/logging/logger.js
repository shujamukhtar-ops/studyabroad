// Minimal structured logger: JSON lines to stdout/stderr, no external dependency.
// Swap the transport here later (e.g. pino) without touching call sites.

function log(level, message, meta = {}) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };
  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info: (message, meta) => log('info', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  error: (message, meta) => {
    const errMeta = meta?.err instanceof Error
      ? { ...meta, err: { message: meta.err.message, stack: meta.err.stack } }
      : meta;
    log('error', message, errMeta);
  },
};
