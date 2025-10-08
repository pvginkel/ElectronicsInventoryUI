import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Readable } from 'node:stream';
import type { TestInfo } from '@playwright/test';
import split2 from 'split2';

type LogSource = 'stdout' | 'stderr' | 'meta';
type LogListener = (formatted: string, index: number) => void;

export interface ServiceLogAttachment {
  readonly filePath: string;
  stop(): Promise<void>;
}

export interface ServiceLogCollector {
  attachStream(stream: Readable, source: 'stdout' | 'stderr'): void;
  log(message: string): void;
  attachToTest(testInfo: TestInfo): Promise<ServiceLogAttachment>;
  getBufferedLines(): string[];
  dispose(): void;
}

export interface BackendLogCollector extends ServiceLogCollector {}
export interface FrontendLogCollector extends ServiceLogCollector {}

export function createBackendLogCollector(options: {
  workerIndex: number;
  streamToConsole: boolean;
}): BackendLogCollector {
  return createServiceLogCollector({
    workerIndex: options.workerIndex,
    streamToConsole: options.streamToConsole,
    attachmentName: 'backend.log',
    serviceLabel: 'backend',
  });
}

export function createFrontendLogCollector(options: {
  workerIndex: number;
  streamToConsole: boolean;
}): FrontendLogCollector {
  return createServiceLogCollector({
    workerIndex: options.workerIndex,
    streamToConsole: options.streamToConsole,
    attachmentName: 'frontend.log',
    serviceLabel: 'frontend',
  });
}

export function createServiceLogCollector(options: {
  workerIndex: number;
  streamToConsole: boolean;
  attachmentName: string;
  serviceLabel: string;
}): ServiceLogCollector {
  return new Collector(
    options.workerIndex,
    options.streamToConsole,
    options.attachmentName,
    options.serviceLabel
  );
}

class Collector implements ServiceLogCollector {
  private readonly listeners = new Set<LogListener>();
  private readonly disposers: Array<() => void> = [];
  private readonly buffer: string[] = [];

  constructor(
    private readonly workerIndex: number,
    private readonly streamToConsole: boolean,
    private readonly attachmentName: string,
    private readonly serviceLabel: string
  ) {}

  attachStream(stream: Readable, source: 'stdout' | 'stderr') {
    const lineStream = stream.pipe(split2());

    const handleLine = (line: string) => {
      this.pushLine(source, line);
    };

    lineStream.on('data', handleLine);
    lineStream.on('error', (error: unknown) => {
      const message =
        error instanceof Error ? error.message : JSON.stringify(error);
      this.pushLine('stderr', `<<stream error>> ${message}`);
    });

    this.disposers.push(() => {
      lineStream.off('data', handleLine);
      lineStream.destroy();
    });
  }

  log(message: string) {
    this.pushLine('meta', message);
  }

  async attachToTest(testInfo: TestInfo): Promise<ServiceLogAttachment> {
    const filePath = testInfo.outputPath(this.attachmentName);
    await mkdir(dirname(filePath), { recursive: true });

    const stream = createWriteStream(filePath, {
      flags: 'a',
      encoding: 'utf8',
    });

    const startIndex = this.buffer.length;
    const captured: string[] = [];

    const replayLine = (formatted: string) => {
      captured.push(formatted);
      stream.write(`${formatted}\n`);
    };

    for (let index = startIndex; index < this.buffer.length; index += 1) {
      replayLine(this.buffer[index]);
    }

    const listener: LogListener = (formatted, index) => {
      if (index >= startIndex) {
        replayLine(formatted);
      }
    };

    this.listeners.add(listener);

    return {
      filePath,
      stop: async () => {
        this.listeners.delete(listener);

        await new Promise<void>((resolve, reject) => {
          stream.end((err: Error | null | undefined) => {
            if (err) {
              reject(err);
              return;
            }
            resolve();
          });
        });

        if (captured.length > 0) {
          const text = captured.join('\n');
          await testInfo.attach(this.attachmentName, {
            body: Buffer.from(text ? `${text}\n` : ''),
            contentType: 'text/plain',
          });
        }
      },
    };
  }

  dispose() {
    for (const dispose of this.disposers) {
      dispose();
    }
    this.listeners.clear();
  }

  getBufferedLines(): string[] {
    return [...this.buffer];
  }

  private pushLine(source: LogSource, line: string) {
    const formatted = `[worker-${this.workerIndex} ${this.serviceLabel}][${source}] ${line}`;
    const index = this.buffer.push(formatted) - 1;

    if (this.streamToConsole) {
      process.stdout.write(`${formatted}\n`);
    }

    for (const listener of this.listeners) {
      listener(formatted, index);
    }
  }
}
