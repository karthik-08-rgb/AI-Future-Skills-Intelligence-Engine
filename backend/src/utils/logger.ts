import { config } from "../config";

type Level = "debug" | "info" | "warn" | "error";
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

interface LogEntry {
  ts: string;
  level: Level;
  msg: string;
  [key: string]: unknown;
}

class Logger {
  private level: Level;

  constructor(level: Level = "info") {
    this.level = level;
  }

  private shouldLog(level: Level): boolean {
    return ORDER[level] >= ORDER[this.level];
  }

  private write(level: Level, msg: string, meta?: Record<string, unknown>) {
    if (!this.shouldLog(level)) return;
    const entry: LogEntry = {
      ts: new Date().toISOString(),
      level,
      msg,
      ...(meta ?? {}),
    };
    const line = JSON.stringify(entry);
    if (level === "error") process.stderr.write(line + "\n");
    else process.stdout.write(line + "\n");
  }

  debug(msg: string, meta?: Record<string, unknown>) {
    this.write("debug", msg, meta);
  }
  info(msg: string, meta?: Record<string, unknown>) {
    this.write("info", msg, meta);
  }
  warn(msg: string, meta?: Record<string, unknown>) {
    this.write("warn", msg, meta);
  }
  error(msg: string, meta?: Record<string, unknown>) {
    this.write("error", msg, meta);
  }
}

export const logger = new Logger(config.logLevel as Level);
export type { LogEntry };
