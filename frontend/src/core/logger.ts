import { getSettings } from '@/store';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const PREFIX = '[Agent Playground]';

function shouldLogDebug(): boolean {
  try {
    return getSettings().debugMode;
  } catch {
    return false;
  }
}

function log(level: LogLevel, message: string, payload?: Record<string, unknown>) {
  const args: unknown[] = [`${PREFIX} ${message}`];
  if (payload && Object.keys(payload).length) {
    args.push(payload);
  }

  switch (level) {
    case 'debug':
      if (shouldLogDebug()) {
        console.debug(...args);
      }
      break;
    case 'info':
      console.info(...args);
      break;
    case 'warn':
      console.warn(...args);
      break;
    case 'error':
      console.error(...args);
      break;
  }
}

export const logger = {
  debug(message: string, payload?: Record<string, unknown>) {
    log('debug', message, payload);
  },
  info(message: string, payload?: Record<string, unknown>) {
    log('info', message, payload);
  },
  warn(message: string, payload?: Record<string, unknown>) {
    log('warn', message, payload);
  },
  error(message: string, payload?: Record<string, unknown>) {
    log('error', message, payload);
  },
};
