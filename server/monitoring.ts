import { pool } from './db';
import { getPollingStatus } from './pollingCoordinator';
import { getQueueStatus } from './bulkQueue';

interface VideoMetrics {
  totalGenerated: number;
  completed: number;
  failed: number;
  pending: number;
  successRate: number;
}

interface ApiTimingMetrics {
  veoApiCalls: {
    count: number;
    totalDuration: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
  };
  dbQueries: {
    count: number;
    totalDuration: number;
    avgDuration: number;
  };
}

interface SystemMetrics {
  uptime: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
  };
  activeWorkers: number;
  maxWorkers: number;
  pollingQueueLength: number;
  bulkQueueLength: number;
  bulkQueueProcessing: boolean;
}

const videoMetrics: VideoMetrics = {
  totalGenerated: 0,
  completed: 0,
  failed: 0,
  pending: 0,
  successRate: 0,
};

const apiTimings = {
  veoApiCalls: [] as number[],
  dbQueries: [] as number[],
};

const MAX_TIMING_SAMPLES = 1000;

const errors: { timestamp: number; message: string; type: string }[] = [];
const MAX_ERROR_LOG = 100;

const serverStartTime = Date.now();

export const monitoring = {
  trackVideoStart() {
    videoMetrics.totalGenerated++;
    videoMetrics.pending++;
    updateSuccessRate();
  },

  trackVideoComplete() {
    videoMetrics.completed++;
    if (videoMetrics.pending > 0) {
      videoMetrics.pending--;
    }
    updateSuccessRate();
  },

  trackVideoFailed() {
    videoMetrics.failed++;
    if (videoMetrics.pending > 0) {
      videoMetrics.pending--;
    }
    updateSuccessRate();
  },

  trackVeoApiCall(duration: number) {
    apiTimings.veoApiCalls.push(duration);
    if (apiTimings.veoApiCalls.length > MAX_TIMING_SAMPLES) {
      apiTimings.veoApiCalls.shift();
    }
  },

  trackDbQuery(duration: number) {
    apiTimings.dbQueries.push(duration);
    if (apiTimings.dbQueries.length > MAX_TIMING_SAMPLES) {
      apiTimings.dbQueries.shift();
    }
  },

  trackError(type: string, message: string) {
    errors.push({
      timestamp: Date.now(),
      type,
      message,
    });
    if (errors.length > MAX_ERROR_LOG) {
      errors.shift();
    }
  },

  getVideoMetrics(): VideoMetrics {
    return { ...videoMetrics };
  },

  getApiTimingMetrics(): ApiTimingMetrics {
    const veoTimings = apiTimings.veoApiCalls;
    const dbTimings = apiTimings.dbQueries;

    return {
      veoApiCalls: {
        count: veoTimings.length,
        totalDuration: veoTimings.reduce((sum, d) => sum + d, 0),
        avgDuration: veoTimings.length > 0 
          ? Math.round(veoTimings.reduce((sum, d) => sum + d, 0) / veoTimings.length)
          : 0,
        minDuration: veoTimings.length > 0 ? Math.min(...veoTimings) : 0,
        maxDuration: veoTimings.length > 0 ? Math.max(...veoTimings) : 0,
      },
      dbQueries: {
        count: dbTimings.length,
        totalDuration: dbTimings.reduce((sum, d) => sum + d, 0),
        avgDuration: dbTimings.length > 0
          ? Math.round(dbTimings.reduce((sum, d) => sum + d, 0) / dbTimings.length)
          : 0,
      },
    };
  },

  getSystemMetrics(): SystemMetrics {
    const pollingStatus = getPollingStatus();
    const bulkStatus = getQueueStatus();
    const memUsage = process.memoryUsage();

    return {
      uptime: Math.floor((Date.now() - serverStartTime) / 1000),
      memoryUsage: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
      },
      activeWorkers: pollingStatus.activeWorkers,
      maxWorkers: pollingStatus.maxWorkers,
      pollingQueueLength: pollingStatus.queueLength,
      bulkQueueLength: bulkStatus.queueLength,
      bulkQueueProcessing: bulkStatus.isProcessing,
    };
  },

  getDbPoolStats() {
    return {
      totalConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingClients: pool.waitingCount,
    };
  },

  getRecentErrors(minutes: number = 5) {
    const cutoff = Date.now() - minutes * 60 * 1000;
    return errors.filter(e => e.timestamp >= cutoff);
  },

  resetMetrics() {
    videoMetrics.totalGenerated = 0;
    videoMetrics.completed = 0;
    videoMetrics.failed = 0;
    videoMetrics.pending = 0;
    videoMetrics.successRate = 0;
    apiTimings.veoApiCalls = [];
    apiTimings.dbQueries = [];
    errors.length = 0;
  },
};

function updateSuccessRate() {
  const total = videoMetrics.completed + videoMetrics.failed;
  videoMetrics.successRate = total > 0 
    ? Math.round((videoMetrics.completed / total) * 100) 
    : 0;
}

setInterval(() => {
  const now = Date.now();
  const cutoff = now - 60 * 60 * 1000;
  
  const oldErrorCount = errors.length;
  while (errors.length > 0 && errors[0].timestamp < cutoff) {
    errors.shift();
  }
  
  if (oldErrorCount !== errors.length) {
    console.log(`[Monitoring] Cleaned up ${oldErrorCount - errors.length} old errors`);
  }
}, 10 * 60 * 1000);
