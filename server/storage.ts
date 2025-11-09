import {
  type User,
  type InsertUser,
  type UpdateUserPlan,
  type UpdateUserApiToken,
  type ApiToken,
  type InsertApiToken,
  type TokenSettings,
  type UpdateTokenSettings,
  type VideoHistory,
  type InsertVideoHistory,
  users,
  apiTokens,
  tokenSettings,
  videoHistory,
} from "@shared/schema";
import { db, withRetry } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

// Token error tracking: tokenId -> array of error timestamps
const tokenErrorTracking = new Map<string, number[]>();
// Token cooldown: tokenId -> cooldown end timestamp
const tokenCooldowns = new Map<string, number>();

const ERROR_THRESHOLD = 10; // Max errors allowed (increased from 5 to allow more retries)
const ERROR_WINDOW_MS = 20 * 60 * 1000; // 20 minutes in milliseconds
const COOLDOWN_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

// Storage interface for user operations
export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  deleteUser(userId: string): Promise<void>;
  updateUserPlan(userId: string, plan: UpdateUserPlan): Promise<User | undefined>;
  removePlan(userId: string): Promise<User | undefined>;
  updateUserApiToken(userId: string, token: UpdateUserApiToken): Promise<User | undefined>;
  incrementDailyVideoCount(userId: string): Promise<void>;
  resetDailyVideoCount(userId: string): Promise<void>;
  checkAndResetDailyCounts(): Promise<void>;
  verifyPassword(user: User, password: string): Promise<boolean>;
  initializeDefaultAdmin(): Promise<void>;
  
  // Token pool management
  getAllApiTokens(): Promise<ApiToken[]>;
  getActiveApiTokens(): Promise<ApiToken[]>;
  addApiToken(token: InsertApiToken): Promise<ApiToken>;
  deleteApiToken(tokenId: string): Promise<void>;
  toggleApiTokenStatus(tokenId: string, isActive: boolean): Promise<ApiToken | undefined>;
  getNextRotationToken(): Promise<ApiToken | undefined>;
  getCurrentBatchToken(): Promise<ApiToken | undefined>;
  getTokenById(tokenId: string): Promise<ApiToken | undefined>;
  getTokenByIndex(index: number): Promise<ApiToken | undefined>;
  updateTokenUsage(tokenId: string): Promise<void>;
  replaceAllTokens(tokens: string[]): Promise<ApiToken[]>;
  recordTokenError(tokenId: string): void;
  isTokenInCooldown(tokenId: string): boolean;
  
  // Token settings
  getTokenSettings(): Promise<TokenSettings | undefined>;
  updateTokenSettings(settings: UpdateTokenSettings): Promise<TokenSettings>;
  initializeTokenSettings(): Promise<void>;
  
  // Video history
  getUserVideoHistory(userId: string): Promise<VideoHistory[]>;
  getVideoById(videoId: string): Promise<VideoHistory | undefined>;
  addVideoHistory(video: InsertVideoHistory): Promise<VideoHistory>;
  updateVideoHistoryStatus(videoId: string, userId: string, status: string, videoUrl?: string, errorMessage?: string): Promise<VideoHistory | undefined>;
  updateVideoHistoryFields(videoId: string, userId: string | undefined, fields: Partial<VideoHistory>): Promise<VideoHistory | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, SALT_ROUNDS);
    
    // Calculate plan expiry if plan is assigned (10 days from now)
    let planExpiry = null;
    let planStartDate = null;
    if (insertUser.planType && insertUser.planType !== "free") {
      planStartDate = new Date().toISOString();
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 10);
      planExpiry = expiryDate.toISOString();
    }
    
    const [user] = await db
      .insert(users)
      .values({
        username: insertUser.username,
        password: hashedPassword,
        isAdmin: insertUser.isAdmin ?? false,
        planType: insertUser.planType || "free",
        planStartDate: planStartDate,
        planExpiry: planExpiry,
        dailyResetDate: new Date().toISOString(),
      })
      .returning();
    return user;
  }

  async deleteUser(userId: string): Promise<void> {
    // First delete user's video history
    await db.delete(videoHistory).where(eq(videoHistory.userId, userId));
    // Then delete the user
    await db.delete(users).where(eq(users.id, userId));
  }

  async updateUserPlan(userId: string, plan: UpdateUserPlan): Promise<User | undefined> {
    try {
      // If assigning a new plan, set start date and expiry
      let planStartDate = plan.planStartDate || null;
      let planExpiry = plan.planExpiry || null;
      
      if (plan.planType !== "free" && !planStartDate) {
        planStartDate = new Date().toISOString();
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 10);
        planExpiry = expiryDate.toISOString();
      }
      
      const [updatedUser] = await db
        .update(users)
        .set({
          planType: plan.planType,
          planStatus: plan.planStatus,
          planStartDate: planStartDate,
          planExpiry: planExpiry,
          dailyVideoCount: 0, // Reset count when plan changes
          dailyResetDate: new Date().toISOString(),
        })
        .where(eq(users.id, userId))
        .returning();
      
      return updatedUser || undefined;
    } catch (error) {
      console.error("Error updating user plan:", error);
      throw error;
    }
  }

  async removePlan(userId: string): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({
          planType: "free",
          planStatus: "active", // Free users remain active
          planStartDate: null,
          planExpiry: null,
          dailyVideoCount: 0,
          dailyResetDate: new Date().toISOString(),
        })
        .where(eq(users.id, userId))
        .returning();
      
      return updatedUser || undefined;
    } catch (error) {
      console.error("Error removing user plan:", error);
      throw error;
    }
  }

  async updateUserApiToken(userId: string, token: UpdateUserApiToken): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({
          apiToken: token.apiToken,
        })
        .where(eq(users.id, userId))
        .returning();
      
      return updatedUser || undefined;
    } catch (error) {
      console.error("Error updating user API token:", error);
      throw error;
    }
  }

  async incrementDailyVideoCount(userId: string): Promise<void> {
    // Use atomic SQL increment to avoid race conditions
    await db
      .update(users)
      .set({ dailyVideoCount: sql`${users.dailyVideoCount} + 1` })
      .where(eq(users.id, userId));
  }

  async resetDailyVideoCount(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        dailyVideoCount: 0,
        dailyResetDate: new Date().toISOString(),
      })
      .where(eq(users.id, userId));
  }

  async checkAndResetDailyCounts(): Promise<void> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    
    // Reset all users whose dailyResetDate is before today
    // This query is more efficient than fetching all users
    await db
      .update(users)
      .set({
        dailyVideoCount: 0,
        dailyResetDate: today,
      })
      .where(sql`daily_reset_date < ${today} OR daily_reset_date IS NULL`);
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    return await bcrypt.compare(password, user.password);
  }

  async initializeDefaultAdmin(): Promise<void> {
    try {
      // Check if default admin already exists
      const existingAdmin = await this.getUserByUsername("muzi");
      
      if (!existingAdmin) {
        // Create default admin user
        const hashedPassword = await bcrypt.hash("muzi123", SALT_ROUNDS);
        await db.insert(users).values({
          username: "muzi",
          password: hashedPassword,
          isAdmin: true,
          planType: "free",
          planStatus: "active",
        });
        console.log("✓ Default admin user created (username: muzi, password: muzi123)");
      }
    } catch (error) {
      // If unique constraint error, admin already exists (race condition)
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        console.log("✓ Default admin user already exists");
      } else {
        console.error("Error initializing default admin:", error);
        throw error;
      }
    }
  }

  // Token pool management methods
  async getAllApiTokens(): Promise<ApiToken[]> {
    return await db.select().from(apiTokens).orderBy(desc(apiTokens.createdAt));
  }

  async getActiveApiTokens(): Promise<ApiToken[]> {
    return await db.select().from(apiTokens).where(eq(apiTokens.isActive, true));
  }

  async addApiToken(token: InsertApiToken): Promise<ApiToken> {
    const [newToken] = await db.insert(apiTokens).values(token).returning();
    return newToken;
  }

  async deleteApiToken(tokenId: string): Promise<void> {
    await db.delete(apiTokens).where(eq(apiTokens.id, tokenId));
  }

  async toggleApiTokenStatus(tokenId: string, isActive: boolean): Promise<ApiToken | undefined> {
    const [updatedToken] = await db
      .update(apiTokens)
      .set({ isActive })
      .where(eq(apiTokens.id, tokenId))
      .returning();
    return updatedToken || undefined;
  }

  async getNextRotationToken(): Promise<ApiToken | undefined> {
    return withRetry(async () => {
      // Get active tokens ordered by least recently used
      const tokens = await db
        .select()
        .from(apiTokens)
        .where(eq(apiTokens.isActive, true))
        .orderBy(apiTokens.lastUsedAt);
      
      // Filter out tokens in cooldown or close to error threshold
      // Use threshold-1 to prevent race conditions with concurrent requests
      const SAFE_THRESHOLD = ERROR_THRESHOLD - 1;
      
      for (const token of tokens) {
        if (this.isTokenInCooldown(token.id)) {
          console.log(`[Token Rotation] Skipping token ${token.id} - in cooldown`);
          continue;
        }
        
        const errorCount = this.getRecentErrorCount(token.id);
        if (errorCount >= SAFE_THRESHOLD) {
          console.log(`[Token Rotation] Skipping token ${token.id} - ${errorCount}/${ERROR_THRESHOLD} errors (too close to threshold)`);
          continue;
        }
        
        return token;
      }
      
      console.log('[Token Rotation] All active tokens are in cooldown or near error threshold');
      return undefined;
    });
  }

  async getCurrentBatchToken(): Promise<ApiToken | undefined> {
    const BATCH_SIZE = 100;
    
    return withRetry(async () => {
      return await db.transaction(async (tx) => {
      // Get token settings to read lastUsedTokenIndex
      const [settings] = await tx.select().from(tokenSettings).limit(1);
      
      if (!settings) {
        console.log('[Batch Token] No token settings found');
        return undefined;
      }
      
      const currentIndex = settings.lastUsedTokenIndex || 0;
      
      // Get all active tokens in consistent order (by creation time)
      const allTokens = await tx
        .select()
        .from(apiTokens)
        .where(eq(apiTokens.isActive, true))
        .orderBy(apiTokens.createdAt);
      
      if (allTokens.length === 0) {
        console.log('[Batch Token] No active tokens available');
        return undefined;
      }
      
      // Filter out tokens in cooldown
      const availableTokens = allTokens.filter(token => !this.isTokenInCooldown(token.id));
      
      if (availableTokens.length === 0) {
        console.log('[Batch Token] All active tokens are in cooldown');
        return undefined;
      }
      
      // Get the current token using round-robin index
      const tokenIndex = currentIndex % availableTokens.length;
      const currentTokenId = availableTokens[tokenIndex].id;
      
      // CRITICAL FIX: Lock the current token row with SELECT FOR UPDATE
      // This prevents race conditions by ensuring only one request can 
      // read and update this token at a time. Other concurrent requests
      // will wait for the lock to be released.
      const [currentToken] = await tx
        .select()
        .from(apiTokens)
        .where(eq(apiTokens.id, currentTokenId))
        .for('update');
      
      if (!currentToken) {
        console.log('[Batch Token] Current token not found after locking');
        return undefined;
      }
      
      // Now we have an exclusive lock on this token row
      // Check if current batch is complete (>= 100 videos)
      if (currentToken.currentBatchCount >= BATCH_SIZE) {
        // Batch is complete, switch to next token
        const nextIndex = (currentIndex + 1) % availableTokens.length;
        const nextTokenId = availableTokens[nextIndex].id;
        
        console.log(`[Batch Token] Token "${currentToken.label}" completed ${BATCH_SIZE} videos, switching to next token`);
        
        // Reset the completed token's counter to 0
        await tx
          .update(apiTokens)
          .set({ currentBatchCount: 0 })
          .where(eq(apiTokens.id, currentToken.id));
        
        console.log(`[Batch Token] Reset token "${currentToken.label}" counter to 0`);
        
        // Lock the next token before updating it to prevent race conditions
        const [nextToken] = await tx
          .select()
          .from(apiTokens)
          .where(eq(apiTokens.id, nextTokenId))
          .for('update');
        
        if (!nextToken) {
          console.log('[Batch Token] Next token not found after locking');
          return undefined;
        }
        
        // Atomically increment the next token's counter and update usage
        const [updatedToken] = await tx
          .update(apiTokens)
          .set({
            currentBatchCount: sql`${apiTokens.currentBatchCount} + 1`,
            totalGenerated: sql`${apiTokens.totalGenerated} + 1`,
            batchStartedAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
          })
          .where(eq(apiTokens.id, nextToken.id))
          .returning();
        
        // Update lastUsedTokenIndex in settings
        await tx
          .update(tokenSettings)
          .set({ lastUsedTokenIndex: nextIndex })
          .where(eq(tokenSettings.id, settings.id));
        
        console.log(`[Batch Token] Using token "${updatedToken.label}" (batch ${updatedToken.currentBatchCount}/${BATCH_SIZE}, total: ${updatedToken.totalGenerated})`);
        
        return updatedToken;
      } else {
        // Continue with current batch
        const batchStartedAt = currentToken.batchStartedAt || new Date().toISOString();
        
        const [updatedToken] = await tx
          .update(apiTokens)
          .set({
            currentBatchCount: sql`${apiTokens.currentBatchCount} + 1`,
            totalGenerated: sql`${apiTokens.totalGenerated} + 1`,
            batchStartedAt: batchStartedAt,
            lastUsedAt: new Date().toISOString(),
          })
          .where(eq(apiTokens.id, currentToken.id))
          .returning();
        
        console.log(`[Batch Token] Using token "${updatedToken.label}" (batch ${updatedToken.currentBatchCount}/${BATCH_SIZE}, total: ${updatedToken.totalGenerated})`);
        
        return updatedToken;
      }
      });
    });
  }

  async getTokenById(tokenId: string): Promise<ApiToken | undefined> {
    const [token] = await db
      .select()
      .from(apiTokens)
      .where(eq(apiTokens.id, tokenId));
    return token || undefined;
  }

  async getTokenByIndex(index: number): Promise<ApiToken | undefined> {
    // Get all active tokens in consistent order (by creation time)
    const tokens = await db
      .select()
      .from(apiTokens)
      .where(eq(apiTokens.isActive, true))
      .orderBy(apiTokens.createdAt);
    
    if (tokens.length === 0) {
      console.log('[Token Rotation] No active tokens available');
      return undefined;
    }
    
    // Filter out tokens in cooldown
    const availableTokens = tokens.filter(token => !this.isTokenInCooldown(token.id));
    
    if (availableTokens.length === 0) {
      console.log('[Token Rotation] All active tokens are in cooldown');
      return undefined;
    }
    
    // Round-robin: select token by index modulo number of available tokens
    const selectedToken = availableTokens[index % availableTokens.length];
    console.log(`[Token Rotation] Selected token ${selectedToken.label} (index ${index} % ${availableTokens.length} tokens = ${index % availableTokens.length})`);
    
    return selectedToken;
  }

  async updateTokenUsage(tokenId: string): Promise<void> {
    return withRetry(async () => {
      const token = await db.select().from(apiTokens).where(eq(apiTokens.id, tokenId));
      if (token[0]) {
        const currentCount = parseInt(token[0].requestCount || "0");
        await db
          .update(apiTokens)
          .set({
            lastUsedAt: new Date().toISOString(),
            requestCount: (currentCount + 1).toString(),
          })
          .where(eq(apiTokens.id, tokenId));
      }
    });
  }

  async replaceAllTokens(tokens: string[]): Promise<ApiToken[]> {
    // Check for duplicates in input
    const uniqueTokens = new Set(tokens);
    if (uniqueTokens.size !== tokens.length) {
      throw new Error("Duplicate tokens found in input");
    }
    
    // Execute deletion and insertion in a single transaction
    return await db.transaction(async (tx) => {
      // First, nullify all tokenUsed references in video_history to avoid foreign key constraint
      await tx
        .update(videoHistory)
        .set({ tokenUsed: null });
      
      console.log('[Bulk Replace] Nullified all tokenUsed references in video history');
      
      // Delete all existing tokens
      await tx.delete(apiTokens);
      
      console.log('[Bulk Replace] Deleted all old tokens');
      
      // Add all new tokens with auto-generated labels
      const newTokens: ApiToken[] = [];
      for (let i = 0; i < tokens.length; i++) {
        const [token] = await tx
          .insert(apiTokens)
          .values({
            token: tokens[i],
            label: `Token ${i + 1}`,
            isActive: true,
          })
          .returning();
        newTokens.push(token);
      }
      
      console.log(`[Bulk Replace] Added ${newTokens.length} new tokens`);
      
      return newTokens;
    });
  }

  recordTokenError(tokenId: string): void {
    const now = Date.now();
    
    // Get or initialize error array for this token
    const errors = tokenErrorTracking.get(tokenId) || [];
    
    // Add new error timestamp
    errors.push(now);
    
    // Remove errors older than ERROR_WINDOW_MS (20 minutes)
    const recentErrors = errors.filter(timestamp => now - timestamp < ERROR_WINDOW_MS);
    
    tokenErrorTracking.set(tokenId, recentErrors);
    
    // Check if we've exceeded the threshold
    if (recentErrors.length >= ERROR_THRESHOLD) {
      const cooldownEnd = now + COOLDOWN_DURATION_MS;
      tokenCooldowns.set(tokenId, cooldownEnd);
      console.log(`[Token Error Tracking] Token ${tokenId} exceeded ${ERROR_THRESHOLD} errors in 20 minutes. Disabled for 2 hours until ${new Date(cooldownEnd).toISOString()}`);
    } else {
      console.log(`[Token Error Tracking] Recorded error for token ${tokenId}. ${recentErrors.length}/${ERROR_THRESHOLD} errors in last 20 minutes`);
    }
  }

  isTokenInCooldown(tokenId: string): boolean {
    const cooldownEnd = tokenCooldowns.get(tokenId);
    
    if (!cooldownEnd) {
      return false;
    }
    
    const now = Date.now();
    
    // Check if cooldown has expired
    if (now >= cooldownEnd) {
      tokenCooldowns.delete(tokenId);
      tokenErrorTracking.delete(tokenId);
      console.log(`[Token Error Tracking] Token ${tokenId} cooldown expired. Re-enabled.`);
      return false;
    }
    
    return true;
  }

  getRecentErrorCount(tokenId: string): number {
    const errors = tokenErrorTracking.get(tokenId) || [];
    const now = Date.now();
    
    // Count errors within the last 20 minutes
    const recentErrors = errors.filter(timestamp => now - timestamp < ERROR_WINDOW_MS);
    return recentErrors.length;
  }

  // Token settings methods
  async getTokenSettings(): Promise<TokenSettings | undefined> {
    const [settings] = await db.select().from(tokenSettings).limit(1);
    return settings || undefined;
  }

  async updateTokenSettings(settings: UpdateTokenSettings): Promise<TokenSettings> {
    const existing = await this.getTokenSettings();
    
    if (existing) {
      const [updated] = await db
        .update(tokenSettings)
        .set(settings)
        .where(eq(tokenSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [newSettings] = await db.insert(tokenSettings).values(settings).returning();
      return newSettings;
    }
  }

  async initializeTokenSettings(): Promise<void> {
    const existing = await this.getTokenSettings();
    if (!existing) {
      await db.insert(tokenSettings).values({});
      console.log("✓ Token rotation settings initialized");
    }
  }

  // Video history methods
  async getUserVideoHistory(userId: string): Promise<VideoHistory[]> {
    return await db
      .select()
      .from(videoHistory)
      .where(eq(videoHistory.userId, userId))
      .orderBy(desc(videoHistory.createdAt))
      .limit(100);
  }

  async getVideoById(videoId: string): Promise<VideoHistory | undefined> {
    const [video] = await db
      .select()
      .from(videoHistory)
      .where(eq(videoHistory.id, videoId));
    return video || undefined;
  }

  async addVideoHistory(video: InsertVideoHistory): Promise<VideoHistory> {
    return withRetry(async () => {
      const [newVideo] = await db
        .insert(videoHistory)
        .values(video)
        .returning();
      return newVideo;
    });
  }

  async updateVideoHistoryStatus(
    videoId: string,
    userId: string,
    status: string,
    videoUrl?: string,
    errorMessage?: string
  ): Promise<VideoHistory | undefined> {
    return withRetry(async () => {
      const updateData: Partial<VideoHistory> = { 
        status,
        updatedAt: sql`now()::text` as any
      };
      if (videoUrl) {
        updateData.videoUrl = videoUrl;
      }
      if (errorMessage) {
        updateData.errorMessage = errorMessage;
      }

      const [updated] = await db
        .update(videoHistory)
        .set(updateData)
        .where(and(eq(videoHistory.id, videoId), eq(videoHistory.userId, userId)))
        .returning();
      return updated || undefined;
    });
  }

  async updateVideoHistoryFields(
    videoId: string,
    userId: string | undefined,
    fields: Partial<VideoHistory>
  ): Promise<VideoHistory | undefined> {
    return withRetry(async () => {
      const whereConditions = userId
        ? and(eq(videoHistory.id, videoId), eq(videoHistory.userId, userId))
        : eq(videoHistory.id, videoId);
      
      const [updated] = await db
        .update(videoHistory)
        .set({ ...fields, updatedAt: sql`now()::text` as any })
        .where(whereConditions)
        .returning();
      return updated || undefined;
    });
  }

  async clearAllVideoHistory(): Promise<void> {
    await db.delete(videoHistory);
  }
}

export const storage = new DatabaseStorage();
