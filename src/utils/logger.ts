type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

function formatLogEntry(entry: LogEntry): string {
  const base = `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`;
  return base;
}

export function log(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
  };

  if (import.meta.env.DEV) {
    const formatted = formatLogEntry(entry);
    const consoleMethod = level === 'info' ? console.log : level === 'warn' ? console.warn : console.error;

    if (context) {
      consoleMethod(formatted, context);
    } else {
      consoleMethod(formatted);
    }
  }
}

export const logger = { log };
