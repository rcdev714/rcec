/**
 * In-memory cache for agent operations
 * Reduces database calls and improves response time for B2C workloads
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
}

interface CacheConfig {
  maxSize: number;
  defaultTTL: number; // milliseconds
}

class AgentCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: config.maxSize || 500, // Max 500 entries
      defaultTTL: config.defaultTTL || 5 * 60 * 1000, // 5 minutes default
    };
  }

  /**
   * Generate a cache key from query parameters
   * Handles circular references and serialization errors gracefully
   */
  private generateKey(prefix: string, params: Record<string, unknown>): string {
    try {
      const sortedParams = Object.keys(params)
        .sort()
        .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
        .map(k => `${k}:${JSON.stringify(params[k])}`)
        .join('|');
      return `${prefix}:${sortedParams}`;
    } catch (error) {
      // Fallback for circular references or other serialization errors
      // Use a deterministic key based on sorted keys and timestamp
      console.warn('[AgentCache] Key generation fallback due to serialization error:', error);
      return `${prefix}:${Object.keys(params).sort().join('|')}:${Date.now()}`;
    }
  }

  /**
   * Get item from cache if valid
   */
  get<T>(key: string, ttl?: number): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    const maxAge = ttl || this.config.defaultTTL;
    const isExpired = Date.now() - entry.timestamp > maxAge;

    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    // Track hits for LRU-like eviction
    entry.hits++;
    return entry.data;
  }

  /**
   * Set item in cache
   */
  set<T>(key: string, data: T): void {
    // Evict if at capacity (remove least hit entries)
    if (this.cache.size >= this.config.maxSize) {
      this.evictLeastUsed();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 1,
    });
  }

  /**
   * Evict least used entries (bottom 20%)
   */
  private evictLeastUsed(): void {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].hits - b[1].hits);
    
    const toRemove = Math.ceil(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats for monitoring
   * Note: avgHitsPerEntry measures average access frequency per cached entry,
   * not a true hit rate (which would require tracking misses)
   */
  getStats(): { size: number; maxSize: number; avgHitsPerEntry: number } {
    let totalHits = 0;
    this.cache.forEach(entry => {
      totalHits += entry.hits;
    });
    
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      avgHitsPerEntry: this.cache.size > 0 ? totalHits / this.cache.size : 0,
    };
  }

  // ==========================================
  // Domain-specific cache methods
  // ==========================================

  /**
   * Cache company search results
   */
  cacheCompanySearch(query: string, filters: Record<string, unknown>, results: unknown): void {
    const key = this.generateKey('company_search', { query, ...filters });
    this.set(key, results);
  }

  /**
   * Get cached company search results
   */
  getCompanySearch(query: string, filters: Record<string, unknown>): unknown | null {
    const key = this.generateKey('company_search', { query, ...filters });
    return this.get(key, 3 * 60 * 1000); // 3 min TTL for searches
  }

  /**
   * Cache company details by RUC
   */
  cacheCompanyDetails(ruc: string, details: unknown): void {
    const key = `company_details:${ruc}`;
    this.set(key, details);
  }

  /**
   * Get cached company details
   */
  getCompanyDetails(ruc: string): unknown | null {
    const key = `company_details:${ruc}`;
    return this.get(key, 10 * 60 * 1000); // 10 min TTL for details
  }

  /**
   * Cache user context (offerings, profile)
   */
  cacheUserContext(userId: string, context: unknown): void {
    const key = `user_context:${userId}`;
    this.set(key, context);
  }

  /**
   * Get cached user context
   */
  getUserContext(userId: string): unknown | null {
    const key = `user_context:${userId}`;
    return this.get(key, 2 * 60 * 1000); // 2 min TTL for user context
  }

  /**
   * Cache web search results
   */
  cacheWebSearch(query: string, results: unknown): void {
    const key = `web_search:${query.toLowerCase().trim()}`;
    this.set(key, results);
  }

  /**
   * Get cached web search results
   */
  getWebSearch(query: string): unknown | null {
    const key = `web_search:${query.toLowerCase().trim()}`;
    return this.get(key, 15 * 60 * 1000); // 15 min TTL for web searches
  }
}

// Singleton instance
export const agentCache = new AgentCache({
  maxSize: 500,
  defaultTTL: 5 * 60 * 1000,
});

// Export class for testing
export { AgentCache };

