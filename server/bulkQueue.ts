import { storage } from "./storage";
import type { ApiToken } from "@shared/schema";
import { enqueueStatusCheck } from "./pollingCoordinator";
import { logger, timing } from "./logger";
import { monitoring } from "./monitoring";

// Queue to store videos pending generation
interface QueuedVideo {
  videoId: string;
  prompt: string;
  aspectRatio: string;
  sceneNumber: number;
  userId: string;
}

const bulkQueue: QueuedVideo[] = [];
let isProcessing = false;
const DELAY_BETWEEN_REQUESTS_MS = 20000; // 20 seconds
const MAX_RETRIES = 2; // Max 2 retries = 3 total attempts
const RETRY_DELAY_MS = 10000; // 10 seconds between retries

/**
 * Handle video failure with automatic retry logic
 * If retryCount < 2, increment and re-queue the video
 * Otherwise, mark as permanently failed
 */
async function handleVideoFailure(
  video: QueuedVideo,
  errorMessage: string,
  rotationToken?: ApiToken
): Promise<void> {
  try {
    // Get current video from database to check retryCount
    const videoRecord = await storage.getVideoById(video.videoId);
    
    if (!videoRecord) {
      console.error(`[Bulk Queue] Video ${video.videoId} not found in database`);
      return;
    }
    
    const currentRetries = videoRecord.retryCount || 0;
    
    if (currentRetries < MAX_RETRIES) {
      // Increment retry count
      const newRetryCount = currentRetries + 1;
      await storage.updateVideoHistoryFields(video.videoId, { 
        retryCount: newRetryCount,
        errorMessage: `${errorMessage} (Retry ${newRetryCount}/${MAX_RETRIES})`
      });
      
      console.log(`[Bulk Queue] ⚠️ Video ${video.sceneNumber} failed (${errorMessage}). Retry ${newRetryCount}/${MAX_RETRIES}. Re-queuing...`);
      
      // Re-queue the video after a delay
      setTimeout(() => {
        bulkQueue.push(video);
        console.log(`[Bulk Queue] Re-queued video ${video.sceneNumber}. Queue size: ${bulkQueue.length}`);
        
        // Restart processing if not already running
        if (!isProcessing) {
          processQueue();
        }
      }, RETRY_DELAY_MS);
      
    } else {
      // Max retries exhausted - mark as permanently failed
      await storage.updateVideoHistoryStatus(
        video.videoId,
        video.userId,
        'failed',
        undefined,
        `${errorMessage} (Failed after ${MAX_RETRIES} retries)`
      );
      console.error(`[Bulk Queue] ❌ Video ${video.sceneNumber} permanently failed after ${MAX_RETRIES} retries: ${errorMessage}`);
    }
    
    // Record token error if applicable
    if (rotationToken) {
      storage.recordTokenError(rotationToken.id);
    }
    
  } catch (error) {
    console.error(`[Bulk Queue] Error handling video failure:`, error);
    // Fallback: mark as failed
    await storage.updateVideoHistoryStatus(video.videoId, video.userId, 'failed', undefined, errorMessage);
  }
}

/**
 * Add videos to the bulk generation queue
 */
export function addToQueue(videos: QueuedVideo[], delaySeconds?: number) {
  bulkQueue.push(...videos);
  logger.info(`[Bulk Queue] Added ${videos.length} videos to queue. Total in queue: ${bulkQueue.length}`);
  
  // Start processing if not already running
  if (!isProcessing) {
    processQueue(delaySeconds);
  }
}

/**
 * Process a single video from the batch
 */
async function processSingleVideo(video: QueuedVideo): Promise<void> {
  const videoTimerId = timing.start('Process Single Video', { sceneNumber: video.sceneNumber, videoId: video.videoId });
  
  try {
    logger.debug(`[Bulk Queue] Processing video ${video.sceneNumber} (ID: ${video.videoId})`);
    
    // Get API token using batch rotation (same token for 100 videos before switching)
    let apiKey: string | undefined;
    let rotationToken: ApiToken | undefined;
    
    rotationToken = await storage.getCurrentBatchToken();
    
    if (rotationToken) {
      apiKey = rotationToken.token;
      logger.debug(`[Bulk Queue] Using token ${rotationToken.label} (ID: ${rotationToken.id}) for video ${video.sceneNumber}`);
      await storage.updateTokenUsage(rotationToken.id);
    }
    
    if (!apiKey) {
      apiKey = process.env.VEO3_API_KEY;
      console.log('[Bulk Queue] Fallback: Using environment variable VEO3_API_KEY');
    }

    if (!apiKey) {
      const errorMessage = `No API key available for video generation (scene ${video.sceneNumber})`;
      console.error(`[Bulk Queue] ❌ CRITICAL: ${errorMessage}`);
      await handleVideoFailure(video, errorMessage);
      return;
    }

    // Send VEO generation request
    const veoProjectId = process.env.VEO3_PROJECT_ID || "5fdc3f34-d4c6-4afb-853a-aba4390bafdc";
    const sceneId = `bulk-${video.videoId}-${Date.now()}`;
    const seed = Math.floor(Math.random() * 100000);

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
          sceneId: sceneId
        }
      }]
    };

    // Add timeout to fetch request (90 seconds - VEO API can be slow to accept requests)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    
    let response;
    let data;
    
    const apiTimerId = timing.start('VEO API Generation Request', { sceneNumber: video.sceneNumber });
    
    try {
      response = await fetch('https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoText', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      data = await response.json();
      
      const apiDuration = timing.end(apiTimerId);
      monitoring.trackVeoApiCall(apiDuration);
    } catch (fetchError: any) {
      clearTimeout(timeout);
      timing.end(apiTimerId, { error: fetchError.message });
      
      if (fetchError.name === 'AbortError') {
        const errorMessage = `Request timeout after 90 seconds - VEO API not responding`;
        logger.error('[Bulk Queue] Request timeout:', fetchError);
        monitoring.trackError('VEO_API_TIMEOUT', errorMessage);
        await handleVideoFailure(video, errorMessage, rotationToken);
      } else {
        const errorMessage = `Network error: ${fetchError.message}`;
        logger.error('[Bulk Queue] Network error:', fetchError);
        monitoring.trackError('VEO_NETWORK_ERROR', errorMessage);
        await handleVideoFailure(video, errorMessage, rotationToken);
      }
      timing.end(videoTimerId, { failed: true });
      return;
    }

    if (!response.ok) {
      const errorMessage = `VEO API error (${response.status}): ${JSON.stringify(data).substring(0, 200)}`;
      console.error('[Bulk Queue] VEO API error:', data);
      await handleVideoFailure(video, errorMessage, rotationToken);
      return;
    }

    if (!data.operations || data.operations.length === 0) {
      const errorMessage = 'No operations returned from VEO API - possible API issue';
      console.error('[Bulk Queue] No operations returned from VEO API');
      await handleVideoFailure(video, errorMessage, rotationToken);
      return;
    }

    const operation = data.operations[0];
    const operationName = operation.operation.name;

    logger.info(`[Bulk Queue] Started generation for video ${video.sceneNumber} - Operation: ${operationName}`);

    // Update history with token ID if available
    if (rotationToken) {
      try {
        await storage.updateVideoHistoryFields(video.videoId, { tokenUsed: rotationToken.id });
      } catch (err) {
        logger.error('[Bulk Queue] Failed to update video history with token ID:', err);
      }
    }

    // Start background polling for this video
    startBackgroundPolling(video.videoId, video.userId, operationName, sceneId, apiKey, rotationToken);
    
    timing.end(videoTimerId, { success: true });

  } catch (error) {
    const errorMessage = `Error processing video: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(`[Bulk Queue] Error processing video ${video.sceneNumber}:`, error);
    monitoring.trackError('VIDEO_PROCESSING', errorMessage);
    await handleVideoFailure(video, errorMessage);
    timing.end(videoTimerId, { failed: true });
  }
}

/**
 * Process the queue in the background with batch processing
 */
async function processQueue(overrideDelaySeconds?: number) {
  if (isProcessing) {
    logger.debug('[Bulk Queue] Already processing queue');
    return;
  }

  isProcessing = true;
  const queueTimerId = timing.start('Bulk Queue Processing', { queueLength: bulkQueue.length });
  logger.info('[Bulk Queue] Started processing queue');

  // Fetch batch settings from database
  let videosPerBatch = 10;
  let batchDelaySeconds = overrideDelaySeconds || 20;
  
  try {
    const settings = await storage.getTokenSettings();
    if (settings) {
      videosPerBatch = parseInt(settings.videosPerBatch, 10) || 5;
      if (!overrideDelaySeconds) {
        batchDelaySeconds = parseInt(settings.batchDelaySeconds, 10) || 20;
      }
      logger.info(`[Bulk Queue] Using batch settings: ${videosPerBatch} videos per batch, ${batchDelaySeconds}s delay${overrideDelaySeconds ? ' (plan-specific)' : ''}`);
    }
  } catch (error) {
    logger.error('[Bulk Queue] Error fetching batch settings, using defaults:', error);
  }

  while (bulkQueue.length > 0) {
    // Get N videos from queue for this batch
    const batchSize = Math.min(videosPerBatch, bulkQueue.length);
    const batch: QueuedVideo[] = [];
    
    for (let i = 0; i < batchSize; i++) {
      const video = bulkQueue.shift();
      if (video) {
        batch.push(video);
      }
    }

    if (batch.length === 0) {
      continue;
    }

    logger.info(`[Bulk Queue] Processing batch of ${batch.length} videos. Remaining in queue: ${bulkQueue.length}`);

    // Controlled concurrency: submit 8 videos at a time (optimized for VPS with 40-connection pool)
    // Increased from 3 to leverage higher connection pool and worker limits
    const MAX_CONCURRENT = 8;
    const batchTimerId = timing.start('Batch Processing', { batchSize: batch.length });
    
    for (let i = 0; i < batch.length; i += MAX_CONCURRENT) {
      const chunk = batch.slice(i, i + MAX_CONCURRENT);
      
      // Process this chunk and wait for all to complete before moving to next chunk
      const promises = chunk.map(video => 
        processSingleVideo(video).catch(err => {
          logger.error(`[Bulk Queue] Error processing video ${video.sceneNumber}:`, err);
        })
      );
      
      await Promise.all(promises);
      logger.debug(`[Bulk Queue] Completed ${Math.min(i + MAX_CONCURRENT, batch.length)}/${batch.length} videos in this batch`);
    }

    timing.end(batchTimerId);
    logger.info(`[Bulk Queue] Batch of ${batch.length} videos submitted`);

    // Wait for batchDelaySeconds before processing next batch
    if (bulkQueue.length > 0) {
      logger.debug(`[Bulk Queue] Waiting ${batchDelaySeconds} seconds before next batch...`);
      await new Promise(resolve => setTimeout(resolve, batchDelaySeconds * 1000));
    }
  }

  isProcessing = false;
  timing.end(queueTimerId);
  logger.info('[Bulk Queue] Finished processing queue');
}

/**
 * Start background polling for a video using the centralized polling coordinator
 */
function startBackgroundPolling(
  videoId: string, 
  userId: string, 
  operationName: string, 
  sceneId: string, 
  apiKey: string,
  rotationToken: ApiToken | undefined
) {
  enqueueStatusCheck(videoId, userId, operationName, sceneId, apiKey, rotationToken);
}

/**
 * Get current queue status
 */
export function getQueueStatus() {
  return {
    queueLength: bulkQueue.length,
    isProcessing
  };
}
