// Type definitions
interface NLPRequestData {
  text: string;
  language: string;
}

interface NLPRequestValue {
  recordId: string;
  data: NLPRequestData;
}

interface NLPRequestBody {
  values: NLPRequestValue[];
}

interface NLPResponse {
  // Define based on actual API response structure
  // For now, using a generic structure that can be refined
  [key: string]: unknown;
}

interface CacheEntry {
  data: NLPResponse;
  timestamp: number;
}

interface MessageRequest {
  action: string;
  raw?: string;
}

interface MessageResponse {
  success: boolean;
  data?: NLPResponse;
  error?: string;
  details?: string;
}

// Configuration
const API_CONFIG = {
  baseUrl: process.env.API_BASE_URL || 'http://localhost:8080',
  endpoint: process.env.API_ENDPOINT || '/noun_phrases',
  timeout: parseInt(process.env.API_TIMEOUT || '10000'), // 10 seconds
  retryAttempts: parseInt(process.env.API_RETRY_ATTEMPTS || '3'),
  retryDelay: parseInt(process.env.API_RETRY_DELAY || '1000'), // 1 second
};

// Cache for processed requests
const requestCache = new Map<string, CacheEntry>();
const CACHE_DURATION = parseInt(process.env.CACHE_DURATION || '300000'); // 5 minutes
const MAX_CACHE_SIZE = parseInt(process.env.MAX_CACHE_SIZE || '1000'); // Maximum number of cached entries

// In-flight requests to prevent duplicates
const pendingRequests = new Map<string, Promise<NLPResponse>>();

// Default headers
const DEFAULT_HEADERS = {
  "Accept": "application/json",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Content-Type": "application/json",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
};

// Utility function to create a cache key
async function createCacheKey(text: string): Promise<string> {
  const normalized = text.trim().toLowerCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Utility function to check if cache entry is still valid
function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_DURATION;
}

// Utility function to remove oldest cache entry when at capacity
function removeOldestCacheEntry(): void {
  if (requestCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = Array.from(requestCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
    requestCache.delete(oldestKey);
  }
}

// Utility function to delay execution
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Enhanced fetch with timeout and retry logic
async function fetchWithRetry(url: string, options: RequestInit, retries: number = API_CONFIG.retryAttempts): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    
    if (retries > 0 && (error instanceof TypeError || (error as Error).name === 'AbortError')) {
      console.warn(`Request failed, retrying... (${retries} attempts left)`);
      await delay(API_CONFIG.retryDelay);
      return fetchWithRetry(url, options, retries - 1);
    }
    
    throw error;
  }
}

// Process text through NLP API
async function processTextWithNLP(text: string): Promise<NLPResponse> {
  const cacheKey = await createCacheKey(text);
  
  // Check cache first
  const cached = requestCache.get(cacheKey);
  if (cached && isCacheValid(cached.timestamp)) {
    console.log('Returning cached result for:', text.substring(0, 50) + '...');
    return cached.data;
  }
  
  // Check if there's already a pending request for this text
  if (pendingRequests.has(cacheKey)) {
    console.log('Waiting for pending request for:', text.substring(0, 50) + '...');
    return await pendingRequests.get(cacheKey)!;
  }
  
  // Create new request
  const requestPromise = (async () => {
    try {
      const requestBody: NLPRequestBody = {
        values: [
          {
            recordId: "a1",
            data: {
              text: text,
              language: "en"
            }
          }
        ]
      };

      const requestOptions: RequestInit = {
        method: "POST",
        headers: DEFAULT_HEADERS,
        body: JSON.stringify(requestBody),
        redirect: "follow"
      };

      const response = await fetchWithRetry(
        `${API_CONFIG.baseUrl}${API_CONFIG.endpoint}`,
        requestOptions
      );
      
      const result = await response.json() as NLPResponse;
      
      // Cache the successful result
      removeOldestCacheEntry(); // Remove oldest entry if at capacity
      requestCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
      
      return result;
    } finally {
      // Clean up pending request
      pendingRequests.delete(cacheKey);
    }
  })();
  
  // Store the pending request
  pendingRequests.set(cacheKey, requestPromise);
  
  return await requestPromise;
}

// Clean up old cache entries periodically
function cleanupCache() {
  const now = Date.now();
  let expiredCount = 0;
  
  // Remove expired entries
  for (const [key, value] of requestCache.entries()) {
    if (!isCacheValid(value.timestamp)) {
      requestCache.delete(key);
      expiredCount++;
    }
  }
  
  // If still over limit after removing expired entries, remove oldest entries
  if (requestCache.size >= MAX_CACHE_SIZE) {
    const entriesToRemove = requestCache.size - MAX_CACHE_SIZE + 1; // +1 to make room for new entry
    const sortedEntries = Array.from(requestCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, entriesToRemove);
    
    for (const [key] of sortedEntries) {
      requestCache.delete(key);
    }
    
    console.log(`Cache cleanup: removed ${expiredCount} expired entries and ${entriesToRemove} oldest entries`);
  } else if (expiredCount > 0) {
    console.log(`Cache cleanup: removed ${expiredCount} expired entries`);
  }
}

// Run cache cleanup every 10 minutes
const cleanupIntervalId = setInterval(cleanupCache, 10 * 60 * 1000);

// Add cleanup on extension unload
self.addEventListener('unload', () => {
  clearInterval(cleanupIntervalId);
  // Clear all caches and pending requests
  requestCache.clear();
  pendingRequests.clear();
});

// Also handle Chrome extension shutdown
chrome.runtime.onSuspend.addListener(() => {
  clearInterval(cleanupIntervalId);
  // Clear all caches and pending requests
  requestCache.clear();
  pendingRequests.clear();
  console.log('Extension suspended, cleanup completed');
});

// Message listener with optimized handling
chrome.runtime.onMessage.addListener((request: MessageRequest, _sender, sendResponse: (response: MessageResponse) => void) => {
  if (request.action === 'fetchData') {
    // Validate input
    if (!request.raw || typeof request.raw !== 'string') {
      sendResponse({ success: false, error: 'Invalid input: raw text is required' });
      return false;
    }
    
    // Process the request asynchronously
    processTextWithNLP(request.raw)
      .then((result) => {
        console.log('NLP processing successful:', result);
        sendResponse({ success: true, data: result });
      })
      .catch((error) => {
        console.error('NLP processing failed:', error);
        sendResponse({ 
          success: false, 
          error: error.message || 'Unknown error occurred',
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
      });
    
    // Keep the message channel open
    return true;
  }
  
  // Handle unknown actions
  sendResponse({ success: false, error: 'Unknown action' });
  return false;
});

// Handle extension installation/update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Paragraph Processor extension installed');
  } else if (details.reason === 'update') {
    console.log('Paragraph Processor extension updated');
    // Clear cache on update to ensure fresh data
    requestCache.clear();
  }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Paragraph Processor extension started');
  // Clear any stale cache entries
  cleanupCache();
});
