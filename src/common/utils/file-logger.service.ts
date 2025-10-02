import { ConsoleLogger, Injectable, LogLevel } from '@nestjs/common';
import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

@Injectable()
export class FileLogger extends ConsoleLogger {
  private readonly logDirectory: string;
  private readonly appLogFileName: string = 'app.log';
  private readonly errorLogFileName: string = 'error.log';

  constructor(logDirectory: string) {
    super();
    this.logDirectory = logDirectory;
    if (!existsSync(this.logDirectory)) {
      mkdirSync(this.logDirectory, { recursive: true });
    }
  }

  log(message: any, context?: string) {
    super.log(message, context);
    this.writeToFile(this.appLogFileName, this.formatMessageForFile('log', message, context));
  }

  error(message: any, stack?: string, context?: string) {
    super.error(message, stack, context);
    this.writeToFile(
      this.errorLogFileName,
      this.formatMessageForFile('error', message, context, stack)
    );
  }

  warn(message: any, context?: string) {
    super.warn(message, context);
    this.writeToFile(this.appLogFileName, this.formatMessageForFile('warn', message, context));
  }

  private formatMessageForFile(
    level: LogLevel,
    message: any,
    context?: string,
    stack?: string
  ): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? `[${context}] ` : '';
    const stackStr = stack ? `\n${stack}` : '';
    const messageStr =
      typeof message === 'object' ? JSON.stringify(message, null, 2) : String(message);

    return `[${timestamp}] [${level.toUpperCase()}] ${contextStr}${messageStr}${stackStr}\n`;
  }

  private writeToFile(fileName: string, message: string) {
    const logFilePath = join(this.logDirectory, fileName);
    try {
      appendFileSync(logFilePath, message);
    } catch (err: unknown) {
      console.error(`[FileLogger] Failed to write to log file: ${fileName}`, err);
    }
  }
}
