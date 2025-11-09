import os from 'os';

const isDevelopment = process.env.NODE_ENV !== 'production';
const isDebugEnabled = process.env.DEBUG === 'true' || isDevelopment;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

const levelColors: Record<LogLevel, string> = {
  debug: colors.gray,
  info: colors.cyan,
  warn: colors.yellow,
  error: colors.red,
};

const levelEmojis: Record<LogLevel, string> = {
  debug: '🔍',
  info: '📘',
  warn: '⚠️',
  error: '❌',
};

function formatTimestamp(): string {
  const now = new Date();
  return now.toISOString();
}

function formatMessage(level: LogLevel, message: string, ...args: any[]): string {
  const timestamp = formatTimestamp();
  const color = levelColors[level];
  const emoji = levelEmojis[level];
  const levelStr = level.toUpperCase().padEnd(5);
  
  let formattedArgs = '';
  if (args.length > 0) {
    formattedArgs = ' ' + args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');
  }
  
  return `${colors.gray}${timestamp}${colors.reset} ${emoji} ${color}${levelStr}${colors.reset} ${message}${formattedArgs}`;
}

function shouldLog(level: LogLevel): boolean {
  if (!isDebugEnabled && level === 'debug') {
    return false;
  }
  return true;
}

class Logger {
  debug(message: string, ...args: any[]) {
    if (shouldLog('debug')) {
      console.log(formatMessage('debug', message, ...args));
    }
  }

  info(message: string, ...args: any[]) {
    if (shouldLog('info')) {
      console.log(formatMessage('info', message, ...args));
    }
  }

  warn(message: string, ...args: any[]) {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message, ...args));
    }
  }

  error(message: string, ...args: any[]) {
    if (shouldLog('error')) {
      console.error(formatMessage('error', message, ...args));
    }
  }

  request(method: string, path: string, statusCode?: number, duration?: number) {
    if (!isDebugEnabled) return;
    
    const statusColor = statusCode && statusCode >= 400 ? colors.red : colors.green;
    const statusStr = statusCode ? `${statusColor}${statusCode}${colors.reset}` : '';
    const durationStr = duration ? `${colors.dim}${duration}ms${colors.reset}` : '';
    
    this.debug(`${colors.bright}${method}${colors.reset} ${path} ${statusStr} ${durationStr}`);
  }

  dbQuery(query: string, duration?: number) {
    if (!isDebugEnabled) return;
    
    const shortQuery = query.length > 100 ? query.substring(0, 100) + '...' : query;
    const durationStr = duration ? `${colors.dim}(${duration}ms)${colors.reset}` : '';
    
    this.debug(`${colors.magenta}[DB]${colors.reset} ${shortQuery} ${durationStr}`);
  }

  memory() {
    if (!isDebugEnabled) return;
    
    const used = process.memoryUsage();
    const heapUsedMB = (used.heapUsed / 1024 / 1024).toFixed(2);
    const heapTotalMB = (used.heapTotal / 1024 / 1024).toFixed(2);
    const rssMB = (used.rss / 1024 / 1024).toFixed(2);
    
    this.debug(`${colors.blue}[MEM]${colors.reset} Heap: ${heapUsedMB}/${heapTotalMB} MB | RSS: ${rssMB} MB`);
  }

  systemStats() {
    if (!isDebugEnabled) return;
    
    const loadAvg = os.loadavg();
    const cpuCount = os.cpus().length;
    const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
    const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
    const uptime = Math.floor(process.uptime());
    
    this.info(`${colors.green}[SYSTEM]${colors.reset} CPU Load: ${loadAvg.map(l => l.toFixed(2)).join(', ')} | CPUs: ${cpuCount} | Memory: ${freeMem}/${totalMem} GB | Uptime: ${uptime}s`);
  }
}

interface TimingData {
  label: string;
  startTime: number;
  context?: any;
}

const activeTimers = new Map<string, TimingData>();

export const timing = {
  start(label: string, context?: any): string {
    const id = `${label}-${Date.now()}-${Math.random()}`;
    activeTimers.set(id, {
      label,
      startTime: performance.now(),
      context
    });
    return id;
  },

  end(id: string, additionalInfo?: any): number {
    const timer = activeTimers.get(id);
    if (!timer) {
      logger.warn(`Timer ${id} not found`);
      return 0;
    }

    const duration = Math.round(performance.now() - timer.startTime);
    activeTimers.delete(id);

    if (isDebugEnabled) {
      const contextStr = timer.context ? ` ${JSON.stringify(timer.context)}` : '';
      const additionalStr = additionalInfo ? ` ${JSON.stringify(additionalInfo)}` : '';
      logger.debug(`${colors.yellow}[TIMING]${colors.reset} ${timer.label}: ${colors.bright}${duration}ms${colors.reset}${contextStr}${additionalStr}`);
    }

    return duration;
  },

  async measure<T>(label: string, fn: () => Promise<T>, context?: any): Promise<T> {
    const id = timing.start(label, context);
    try {
      const result = await fn();
      timing.end(id);
      return result;
    } catch (error) {
      timing.end(id, { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  },

  measureSync<T>(label: string, fn: () => T, context?: any): T {
    const id = timing.start(label, context);
    try {
      const result = fn();
      timing.end(id);
      return result;
    } catch (error) {
      timing.end(id, { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }
};

export const logger = new Logger();
