// Cloudinary upload utility for videos and images
// Fetches video from VEO URL and uploads to Cloudinary
// Converts base64 images and uploads to Cloudinary

import { readFile } from 'fs/promises';

const CLOUDINARY_CLOUD_NAME = 'dy40igzli';
const CLOUDINARY_UPLOAD_PRESET = 'demo123';
const CLOUDINARY_VIDEO_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`;
const CLOUDINARY_IMAGE_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

// Retry helper for network operations (fetch from Google Cloud Storage, upload to Cloudinary)
async function withNetworkRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 5,
  baseDelayMs: number = 1000,
  operationName: string = 'Network operation'
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Retry on network errors
      const isRetryable = 
        error.message?.includes('fetch failed') ||
        error.message?.includes('ECONNRESET') ||
        error.message?.includes('ETIMEDOUT') ||
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('socket disconnected') ||
        error.message?.includes('TLS connection') ||
        error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'EPIPE';
      
      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }
      
      // Exponential backoff with jitter
      const backoff = Math.min(baseDelayMs * Math.pow(2, attempt), 10000);
      const jitter = Math.random() * backoff * 0.3;
      const totalDelay = backoff + jitter;
      
      console.log(`[Network Retry] ${operationName} - Attempt ${attempt + 1}/${maxRetries} failed (${error.message}), retrying in ${Math.round(totalDelay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
  }
  
  throw lastError || new Error(`${operationName} failed after retries`);
}

interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  format: string;
  duration: number;
  width: number;
  height: number;
  url: string;
}

export async function uploadVideoToCloudinary(videoUrlOrPath: string): Promise<string> {
  try {
    // Step 1: Fetch video with retry logic
    const videoBlob = await withNetworkRetry(async () => {
      // Check if it's a local file path or URL
      if (videoUrlOrPath.startsWith('http://') || videoUrlOrPath.startsWith('https://')) {
        // It's a URL - fetch from remote
        console.log('[Cloudinary] Starting upload from URL:', videoUrlOrPath.substring(0, 100));
        console.log('[Cloudinary] Fetching video from URL...');
        const videoResponse = await fetch(videoUrlOrPath);
        
        if (!videoResponse.ok) {
          throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);
        }

        const blob = await videoResponse.blob();
        console.log('[Cloudinary] Video fetched, size:', blob.size, 'bytes');
        return blob;
      } else {
        // It's a local file path - read from disk and convert to Blob
        console.log('[Cloudinary] Starting upload from local file:', videoUrlOrPath);
        const fileBuffer = await readFile(videoUrlOrPath);
        const blob = new Blob([fileBuffer], { type: 'video/mp4' });
        console.log('[Cloudinary] File read, size:', blob.size, 'bytes');
        return blob;
      }
    }, 5, 1000, 'Fetch video from Google Cloud Storage');

    // Step 2: Upload to Cloudinary with retry logic
    const cloudinaryUrl = await withNetworkRetry(async () => {
      const formData = new FormData();
      formData.append('file', videoBlob, 'video.mp4');
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      console.log('[Cloudinary] Uploading to Cloudinary...');
      const uploadResponse = await fetch(CLOUDINARY_VIDEO_UPLOAD_URL, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Cloudinary upload failed: ${uploadResponse.statusText} - ${errorText}`);
      }

      const result: CloudinaryUploadResponse = await uploadResponse.json();
      console.log('[Cloudinary] Upload successful! URL:', result.secure_url);
      return result.secure_url;
    }, 5, 1000, 'Upload to Cloudinary');

    return cloudinaryUrl;
  } catch (error) {
    console.error('[Cloudinary] Upload error:', error);
    throw new Error(`Failed to upload video to Cloudinary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function uploadImageToCloudinary(base64Data: string, extension: string = 'png'): Promise<string> {
  try {
    console.log(`[Cloudinary] Converting base64 to ${extension} image...`);
    
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');
    console.log(`[Cloudinary] Image size: ${imageBuffer.length} bytes`);
    
    // Create blob from buffer
    const imageBlob = new Blob([imageBuffer], { 
      type: extension === 'jpg' ? 'image/jpeg' : `image/${extension}` 
    });

    // Upload to Cloudinary with retry logic
    const cloudinaryUrl = await withNetworkRetry(async () => {
      const formData = new FormData();
      formData.append('file', imageBlob, `image.${extension}`);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'ai-images');

      console.log('[Cloudinary] Uploading image to Cloudinary...');
      const uploadResponse = await fetch(CLOUDINARY_IMAGE_UPLOAD_URL, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Cloudinary upload failed: ${uploadResponse.statusText} - ${errorText}`);
      }

      const result: CloudinaryUploadResponse = await uploadResponse.json();
      console.log('[Cloudinary] Image upload successful! URL:', result.secure_url);
      return result.secure_url;
    }, 5, 1000, 'Upload image to Cloudinary');
    
    return cloudinaryUrl;
  } catch (error) {
    console.error('[Cloudinary] Image upload error:', error);
    throw new Error(`Failed to upload image to Cloudinary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
