type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: number =
  LEVELS[(import.meta.env.VITE_LOG_LEVEL as LogLevel) ?? "debug"] ?? 0;

function prefix(level: LogLevel): string {
  const ts = new Date().toISOString().slice(11, 23);
  return `${ts} [${level.toUpperCase()}]`;
}

export const logger = {
  debug: (...args: unknown[]) => {
    if (LEVELS.debug >= currentLevel) console.debug(prefix("debug"), ...args);
  },
  info: (...args: unknown[]) => {
    if (LEVELS.info >= currentLevel) console.info(prefix("info"), ...args);
  },
  warn: (...args: unknown[]) => {
    if (LEVELS.warn >= currentLevel) console.warn(prefix("warn"), ...args);
  },
  error: (...args: unknown[]) => {
    if (LEVELS.error >= currentLevel) console.error(prefix("error"), ...args);
  },
};
