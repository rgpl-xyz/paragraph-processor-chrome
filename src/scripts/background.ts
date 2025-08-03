// Configuration
const API_CONFIG = {
  baseUrl: 'http://localhost:8080',
  endpoint: '/noun_phrases',
  timeout: 10000, // 10 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
};

// Cache for processed requests
const requestCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// In-flight requests to prevent duplicates
const pendingRequests = new Map<string, Promise<any>>();

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
function createCacheKey(text: string): string {
  return btoa(text.trim().toLowerCase()).slice(0, 50); // Truncate to avoid extremely long keys
}

// Utility function to check if cache entry is still valid
function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_DURATION;
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
async function processTextWithNLP(text: string): Promise<any> {
  const cacheKey = createCacheKey(text);
  
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
      const requestBody = {
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
      
      const result = await response.json();
      
      // Cache the successful result
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
  for (const [key, value] of requestCache.entries()) {
    if (!isCacheValid(value.timestamp)) {
      requestCache.delete(key);
    }
  }
}

// Run cache cleanup every 10 minutes
setInterval(cleanupCache, 10 * 60 * 1000);

// Message listener with optimized handling
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
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
