import { storage } from "./storage";
import type { ApiToken } from "@shared/schema";
import { Agent } from "undici";
import { logger, timing } from "./logger";
import { monitoring } from "./monitoring";

const veoAgent = new Agent({
  keepAliveTimeout: 30000,
  connectTimeout: 10000,
  pipelining: 0,
  connections: 40 // Increased to support 20 concurrent workers for VPS deployment
});

interface PollingJob {
  videoId: string;
  userId: string;
  operationName: string;
  sceneId: string;
  apiKey: string;
  rotationToken: ApiToken | undefined;
  attempts: number;
  hasRetriedWithNewToken: boolean;
}

const pollingQueue: PollingJob[] = [];
let activeWorkers = 0;
const MAX_CONCURRENT_WORKERS = 20; // Optimized for VPS deployment with 40 DB connections
const POLL_INTERVAL_MS = 15000; // 15 seconds between status checks
const MAX_ATTEMPTS = 240; // 1 hour max (240 attempts * 15 seconds)
const RETRY_ATTEMPT = 8; // 2 minutes (8 * 15 seconds)
const lastDbUpdate = new Map<string, number>(); // Track last DB update timestamp per video

/**
 * Enqueue a video for status checking
 */
export function enqueueStatusCheck(
  videoId: string,
  userId: string,
  operationName: string,
  sceneId: string,
  apiKey: string,
  rotationToken: ApiToken | undefined
) {
  const job: PollingJob = {
    videoId,
    userId,
    operationName,
    sceneId,
    apiKey,
    rotationToken,
    attempts: 0,
    hasRetriedWithNewToken: false,
  };

  pollingQueue.push(job);
  logger.debug(`[Polling Coordinator] Enqueued video ${videoId}. Queue length: ${pollingQueue.length}, Active workers: ${activeWorkers}`);
  monitoring.trackVideoStart();

  // Start workers if we have capacity
  startWorkers();
}

/**
 * Start worker pool to process the queue
 */
function startWorkers() {
  while (activeWorkers < MAX_CONCURRENT_WORKERS && pollingQueue.length > 0) {
    const job = pollingQueue.shift();
    if (job) {
      activeWorkers++;
      logger.debug(`[Polling Coordinator] Starting worker for video ${job.videoId}. Active workers: ${activeWorkers}/${MAX_CONCURRENT_WORKERS}`);
      processJob(job);
    }
  }
}

/**
 * Process a single polling job with retry logic
 */
async function processJob(job: PollingJob) {
  try {
    await new Promise(resolve => setTimeout(resolve, 15000));
    let completed = false;
    let consecutiveFailures = 0;

    while (!completed && job.attempts < MAX_ATTEMPTS) {
      // Wait before next poll (skip on first attempt)
      if (job.attempts > 0) {
        let totalDelay: number;
        
        if (consecutiveFailures === 0) {
          totalDelay = POLL_INTERVAL_MS;
        } else {
          const backoffMultiplier = Math.min(Math.pow(2, consecutiveFailures - 1), 4);
          const backoffDelay = POLL_INTERVAL_MS * backoffMultiplier;
          const jitter = Math.random() * backoffDelay;
          totalDelay = Math.min(backoffDelay + jitter, 120000);
          
          console.log(`[Polling Coordinator] Video ${job.videoId} - Waiting ${Math.round(totalDelay)}ms before next poll (consecutive failures: ${consecutiveFailures})`);
        }
        
        await new Promise(resolve => setTimeout(resolve, totalDelay));
      }
      
      job.attempts++;

      // Update video's updatedAt timestamp to prevent timeout cleanup
      // Only update every 60 seconds to reduce database load (75% reduction)
      const now = Date.now();
      const lastUpdate = lastDbUpdate.get(job.videoId);
      const shouldUpdate = !lastUpdate || (now - lastUpdate) >= 60000;
      
      if (shouldUpdate) {
        try {
          await storage.updateVideoHistoryFields(job.videoId, {});
          lastDbUpdate.set(job.videoId, now);
        } catch (error) {
          console.error(`[Polling Coordinator] Failed to update video ${job.videoId} timestamp:`, error);
        }
      }

      // After 2 minutes, try with next API token if not completed
      if (job.attempts === RETRY_ATTEMPT && !completed && !job.hasRetriedWithNewToken) {
        console.log(`[Polling Coordinator] Video ${job.videoId} not completed after 2 minutes, trying with next API token...`);
        
        if (job.rotationToken) {
          storage.recordTokenError(job.rotationToken.id);
        }

        const retrySuccess = await retryWithNewToken(job);
        if (!retrySuccess) {
          // If retry failed, continue with current token
          console.log(`[Polling Coordinator] Retry with new token failed for video ${job.videoId}, continuing with current token`);
        }
      }

      // Check video status
      const statusResult = await checkVideoStatus(job);
      
      if (statusResult.completed) {
        completed = true;
        consecutiveFailures = 0;
        console.log(`[Polling Coordinator] Video ${job.videoId} completed after ${job.attempts} attempts`);
      } else if (statusResult.failed) {
        completed = true;
        console.log(`[Polling Coordinator] Video ${job.videoId} failed after ${job.attempts} attempts`);
      } else if (statusResult.shouldBackoff) {
        consecutiveFailures++;
        console.log(`[Polling Coordinator] Video ${job.videoId} encountered network error or 5xx response, consecutive failures: ${consecutiveFailures}`);
      } else {
        consecutiveFailures = 0;
      }
    }

    // If not completed after max attempts, mark as failed
    if (!completed) {
      const errorMessage = `Video generation timed out after ${MAX_ATTEMPTS * POLL_INTERVAL_MS / 1000} seconds (${MAX_ATTEMPTS} attempts)`;
      console.log(`[Polling Coordinator] Video ${job.videoId} timed out after ${MAX_ATTEMPTS} attempts`);
      await storage.updateVideoHistoryStatus(job.videoId, job.userId, 'failed', undefined, errorMessage);
      lastDbUpdate.delete(job.videoId); // Clean up tracking
    }
  } catch (error) {
    const errorMessage = `Fatal error during video generation: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`[Polling Coordinator] Fatal error processing video ${job.videoId}:`, error);
    await storage.updateVideoHistoryStatus(job.videoId, job.userId, 'failed', undefined, errorMessage);
    lastDbUpdate.delete(job.videoId); // Clean up tracking
  } finally {
    // Worker finished, decrement counter and start next worker
    activeWorkers--;
    logger.debug(`[Polling Coordinator] Worker finished for video ${job.videoId}. Active workers: ${activeWorkers}/${MAX_CONCURRENT_WORKERS}, Queue length: ${pollingQueue.length}`);
    
    // Start next worker if there are more jobs in the queue
    startWorkers();
  }
}

/**
 * Retry video generation with a new API token
 */
async function retryWithNewToken(job: PollingJob): Promise<boolean> {
  try {
    const nextToken = await storage.getNextRotationToken();
    
    if (nextToken && nextToken.id !== job.rotationToken?.id) {
      console.log(`[Polling Coordinator] Switching to next token: ${nextToken.label}`);
      job.apiKey = nextToken.token;
      job.rotationToken = nextToken;
      await storage.updateTokenUsage(nextToken.id);
      
      // Start new generation with the new token
      const veoProjectId = process.env.VEO3_PROJECT_ID || "5fdc3f34-d4c6-4afb-853a-aba4390bafdc";
      const newSceneId = `retry-${job.videoId}-${Date.now()}`;
      const seed = Math.floor(Math.random() * 100000);

      const video = await storage.updateVideoHistoryStatus(job.videoId, job.userId, 'pending');
      if (!video) return false;

      const payload = {
        clientContext: {
          projectId: veoProjectId,
          tool: "PINHOLE",
          userPaygateTier: "PAYGATE_TIER_TWO"
        },
        requests: [{
          aspectRatio: video.aspectRatio === "portrait" ? "VIDEO_ASPECT_RATIO_PORTRAIT" : "VIDEO_ASPECT_RATIO_LANDSCAPE",
          seed: seed,
          textInput: {
            prompt: video.prompt
          },
          videoModelKey: video.aspectRatio === "portrait" ? "veo_3_1_t2v_fast_portrait_ultra" : "veo_3_1_t2v_fast_ultra",
          metadata: {
            sceneId: newSceneId
          }
        }]
      };

      const retryController = new AbortController();
      const retryTimeout = setTimeout(() => retryController.abort(), 90000);
      
      const response = await fetch('https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoText', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${job.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: retryController.signal,
        dispatcher: veoAgent,
      } as any);
      
      clearTimeout(retryTimeout);

      const data = await response.json();
      
      if (response.ok && data.operations && data.operations.length > 0) {
        job.operationName = data.operations[0].operation.name;
        job.sceneId = newSceneId;
        job.hasRetriedWithNewToken = true;
        console.log(`[Polling Coordinator] Started new generation with token ${nextToken.label}`);
        
        await storage.updateVideoHistoryFields(job.videoId, { tokenUsed: nextToken.id });
        return true;
      }
    }
  } catch (retryError) {
    console.error('[Polling Coordinator] Error retrying with new token:', retryError);
  }
  
  return false;
}

/**
 * Check the status of a video generation
 */
async function checkVideoStatus(job: PollingJob): Promise<{ completed: boolean; failed: boolean; shouldBackoff: boolean }> {
  const timerId = timing.start('VEO Status Check', { videoId: job.videoId });
  
  try {
    const requestBody = {
      operations: [{
        operation: {
          name: job.operationName
        },
        sceneId: job.sceneId,
        status: "MEDIA_GENERATION_STATUS_PENDING"
      }]
    };

    const statusController = new AbortController();
    const statusTimeout = setTimeout(() => statusController.abort(), 30000);

    const statusResponse = await fetch('https://aisandbox-pa.googleapis.com/v1/video:batchCheckAsyncVideoGenerationStatus', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${job.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: statusController.signal,
      dispatcher: veoAgent,
    } as any);

    clearTimeout(statusTimeout);
    
    const apiDuration = timing.end(timerId);
    monitoring.trackVeoApiCall(apiDuration);

    if (!statusResponse.ok) {
      const is5xxError = statusResponse.status >= 500 && statusResponse.status < 600;
      console.error(`[Polling Coordinator] Status check failed (${statusResponse.status}) for video ${job.videoId} - will retry on next poll${is5xxError ? ' with backoff' : ''}`);
      return { completed: false, failed: false, shouldBackoff: is5xxError };
    }

    const statusData = await statusResponse.json();
    console.log(`[Polling Coordinator] Status for ${job.videoId}:`, JSON.stringify(statusData, null, 2).substring(0, 500));

    if (statusData.operations && statusData.operations.length > 0) {
      const operationData = statusData.operations[0];
      const operation = operationData.operation;
      const opStatus = operationData.status;
      
      console.log(`[Polling Coordinator] Video ${job.videoId} status: ${opStatus}`);
      
      // Extract video URL from nested metadata structure
      let veoVideoUrl: string | undefined;
      
      if (operation?.metadata?.video?.fifeUrl) {
        veoVideoUrl = operation.metadata.video.fifeUrl;
      } else if (operation?.videoUrl) {
        veoVideoUrl = operation.videoUrl;
      } else if (operation?.fileUrl) {
        veoVideoUrl = operation.fileUrl;
      } else if (operation?.downloadUrl) {
        veoVideoUrl = operation.downloadUrl;
      }
      
      // Decode HTML entities
      if (veoVideoUrl) {
        veoVideoUrl = veoVideoUrl
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
      }
      
      // Check if video is completed
      if (opStatus === 'MEDIA_GENERATION_STATUS_COMPLETE' || opStatus === 'MEDIA_GENERATION_STATUS_SUCCESSFUL' || opStatus === 'COMPLETED') {
        if (veoVideoUrl) {
          logger.info(`[Polling Coordinator] Video ${job.videoId} completed, uploading to Cloudinary...`);
          
          const uploadTimerId = timing.start('Cloudinary Upload', { videoId: job.videoId });
          const { uploadVideoToCloudinary } = await import('./cloudinary');
          const cloudinaryUrl = await uploadVideoToCloudinary(veoVideoUrl);
          timing.end(uploadTimerId);
          
          await storage.updateVideoHistoryStatus(job.videoId, job.userId, 'completed', cloudinaryUrl);
          lastDbUpdate.delete(job.videoId); // Clean up tracking on completion
          monitoring.trackVideoComplete();
          logger.info(`[Polling Coordinator] Video ${job.videoId} completed successfully`);
          return { completed: true, failed: false, shouldBackoff: false };
        } else {
          logger.warn(`[Polling Coordinator] Video ${job.videoId} shows complete but no URL found`);
        }
      } else if (operation?.error) {
        const errorMessage = `VEO generation failed: ${operation.error.message || JSON.stringify(operation.error).substring(0, 200)}`;
        logger.error(`[Polling Coordinator] Video ${job.videoId} failed:`, operation.error);
        await storage.updateVideoHistoryStatus(job.videoId, job.userId, 'failed', undefined, errorMessage);
        lastDbUpdate.delete(job.videoId); // Clean up tracking on failure
        monitoring.trackVideoFailed();
        monitoring.trackError('VEO_GENERATION', errorMessage);
        
        if (job.rotationToken) {
          storage.recordTokenError(job.rotationToken.id);
        }
        return { completed: false, failed: true, shouldBackoff: false };
      }
    }
    
    return { completed: false, failed: false, shouldBackoff: false };
  } catch (pollError: any) {
    const isNetworkError = 
      pollError.name === 'AbortError' ||
      pollError.code === 'ECONNRESET' ||
      pollError.cause?.code === 'ECONNRESET' ||
      pollError.message?.includes('fetch failed');
    
    if (pollError.name === 'AbortError') {
      console.error(`[Polling Coordinator] Status check timeout for video ${job.videoId} - will retry on next poll with backoff`);
    } else if (pollError.code === 'ECONNRESET' || pollError.cause?.code === 'ECONNRESET') {
      console.error(`[Polling Coordinator] Network connection reset for video ${job.videoId} - will retry on next poll with backoff`);
    } else if (isNetworkError) {
      console.error(`[Polling Coordinator] Network error for video ${job.videoId} - will retry on next poll with backoff:`, pollError.message);
    } else {
      console.error(`[Polling Coordinator] Error polling video ${job.videoId}:`, pollError);
    }
    return { completed: false, failed: false, shouldBackoff: isNetworkError };
  }
}

/**
 * Get current polling coordinator status
 */
export function getPollingStatus() {
  return {
    queueLength: pollingQueue.length,
    activeWorkers,
    maxWorkers: MAX_CONCURRENT_WORKERS
  };
}
