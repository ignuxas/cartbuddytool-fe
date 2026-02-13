import useSWR, { SWRConfiguration, mutate } from 'swr';
import { config } from '@/lib/config';

/**
 * SWR-based data fetching with caching for CartBuddy
 * 
 * Benefits:
 * - Automatic caching of responses
 * - Deduplication of requests (multiple components = 1 request)
 * - Stale-while-revalidate (shows cached data instantly, revalidates in background)
 * - Automatic revalidation on focus/reconnect
 */

// Custom fetcher for authenticated API calls
export const authenticatedFetcher = async (
  url: string, 
  authKey: string,
  options?: { method?: string; body?: any }
) => {
  const response = await fetch(url, {
    method: options?.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Key': authKey,
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { error: errorText || `HTTP ${response.status}` };
    }
    const error = new Error(errorData.error || `Request failed with status ${response.status}`);
    (error as any).status = response.status;
    throw error;
  }

  return response.json();
};

// Default SWR config for the app
export const swrConfig: SWRConfiguration = {
  revalidateOnFocus: false, // Don't refetch when window regains focus (reduces requests)
  revalidateOnReconnect: true, // Refetch when internet reconnects
  dedupingInterval: 5000, // Dedupe requests within 5 seconds
  errorRetryCount: 2, // Retry failed requests twice
  shouldRetryOnError: (error) => {
    // Don't retry on 4xx errors (client errors)
    return !(error as any)?.status || (error as any).status >= 500;
  },
};

/**
 * Hook for fetching project data with caching
 */
export function useProjectData(domain: string | null, authKey: string | null) {
  const url = domain && authKey 
    ? `${config.serverUrl}/api/scrape/check-existing/` 
    : null;

  const { data, error, isLoading, mutate: revalidate } = useSWR(
    // Key includes domain to cache per-project
    url ? ['project-data', domain] : null,
    async () => {
      if (!authKey || !domain) return null;
      return authenticatedFetcher(
        `${config.serverUrl}/api/scrape/check-existing/`,
        authKey,
        { method: 'POST', body: { url: `http://${domain}` } }
      );
    },
    {
      ...swrConfig,
      revalidateOnMount: true, // Always fetch on first mount
    }
  );

  return {
    projectData: data,
    isLoading,
    error,
    revalidate,
  };
}

/**
 * Hook for fetching widget settings with caching
 * Supports both authenticated (POST) and public (GET) fetching
 */
export function useWidgetSettings(domain: string | null, authKey: string | null = null) {
  const isPublic = !authKey;

  const { data, error, isLoading, mutate: revalidate } = useSWR(
    domain ? ['widget-settings', domain, isPublic ? 'public' : 'private'] : null,
    async () => {
      if (!domain) return null;
      
      if (isPublic) {
        // Public GET request
        const res = await fetch(`${config.serverUrl}/api/widget/settings/?domain=${encodeURIComponent(domain)}`);
        if (!res.ok) {
           const text = await res.text();
           throw new Error(text || "Failed to fetch settings");
        }
        return res.json();
      } else {
        // Authenticated GET request
        return authenticatedFetcher(
          `${config.serverUrl}/api/widget/settings/?domain=${encodeURIComponent(domain)}`,
          authKey!,
          { method: 'GET' }
        );
      }
    },
    {
      ...swrConfig,
      dedupingInterval: 10000, // Widget settings change less often
    }
  );

  return {
    settings: data,
    isLoading,
    error,
    revalidate,
  };
}

/**
 * Hook for fetching webhook secret with caching
 */
export function useWebhookSecret(domain: string | null, authKey: string | null, enabled = true) {
  const { data, error, isLoading } = useSWR(
    domain && authKey && enabled ? ['webhook-secret', domain] : null,
    async () => {
      if (!authKey || !domain) return null;
      return authenticatedFetcher(
        `${config.serverUrl}/api/widget/secret/`,
        authKey,
        { method: 'POST', body: { domain } }
      );
    },
    {
      ...swrConfig,
      dedupingInterval: 30000, // Secrets rarely change
    }
  );

  return {
    secret: data?.secret || null,
    isLoading,
    error,
  };
}

/**
 * Hook for fetching additional URLs with caching
 */
export function useAdditionalUrls(
  domain: string | null, 
  authKey: string | null, 
  enabled = false
) {
  const url = domain ? `http://${domain}` : null;
  
  const { data, error, isLoading, mutate: revalidate } = useSWR(
    url && authKey && enabled ? ['additional-urls', domain] : null,
    async () => {
      if (!authKey || !url) return null;
      return authenticatedFetcher(
        `${config.serverUrl}/api/scrape/get-urls/`,
        authKey,
        { method: 'POST', body: { url } }
      );
    },
    {
      ...swrConfig,
      revalidateOnMount: true,
    }
  );

  return {
    urls: data?.urls || [],
    isLoading,
    error,
    revalidate,
  };
}

/**
 * Invalidate all cached data for a domain
 * Call this after mutations (scraping, saving, etc.)
 */
export function invalidateProjectCache(domain: string) {
  mutate(['project-data', domain]);
  mutate(['scraping-page-data', domain]);
  mutate(['widget-settings', domain]);
  mutate(['webhook-secret', domain]);
  mutate(['additional-urls', domain]);
}

/**
 * Invalidate specific cache key
 */
export function invalidateCache(key: any[]) {
  mutate(key);
}

/**
 * Hook for the Scraping & Data page.
 * Fetches scraped pages, active job, and blacklist in a single request.
 */
export function useScrapingPageData(domain: string | null, authKey: string | null) {
  const { data, error, isLoading, mutate: revalidate } = useSWR(
    domain && authKey ? ['scraping-page-data', domain] : null,
    async () => {
      if (!authKey || !domain) return null;
      return authenticatedFetcher(
        `${config.serverUrl}/api/scrape/project-data/`,
        authKey,
        { method: 'POST', body: { url: `http://${domain}` } }
      );
    },
    {
      ...swrConfig,
      revalidateOnMount: true,
    }
  );

  return {
    data,
    isLoading,
    error,
    revalidate,
  };
}

/**
 * Update cached data optimistically
 */

/**
 * Hook for fetching available AI models with caching.
 * Models rarely change, so we use a long dedup interval.
 */
export function useAvailableModels(authKey: string | null) {
  const { data, error, isLoading } = useSWR(
    authKey ? ['ai-models', authKey] : null,
    async () => {
      if (!authKey) return null;
      return authenticatedFetcher(
        `${config.serverUrl}/api/ai-models/`,
        authKey
      );
    },
    {
      ...swrConfig,
      dedupingInterval: 60000, // Models almost never change
    }
  );

  return {
    models: data?.models || [],
    isLoading,
    error,
  };
}

/**
 * Hook for fetching metrics dashboard data with caching.
 */
export function useMetricsDashboard(domain: string | null, authKey: string | null) {
  const { data, error, isLoading, mutate: revalidate } = useSWR(
    domain && authKey ? ['metrics-dashboard', domain] : null,
    async () => {
      if (!authKey || !domain) return null;
      const res = await fetch(
        `${config.serverUrl}/api/metrics/?domain=${encodeURIComponent(domain)}`,
        { headers: { 'X-Auth-Key': authKey } }
      );
      if (!res.ok) throw new Error(`Failed to fetch metrics: ${res.statusText}`);
      return res.json();
    },
    {
      ...swrConfig,
      dedupingInterval: 15000, // Metrics can update frequently
    }
  );

  return {
    metrics: data,
    isLoading,
    error,
    revalidate,
  };
}

export function useMasterPrompts(authKey: string) {
  const { data, error, isLoading, mutate } = useSWR(
    authKey ? [`${config.serverUrl}/api/master-prompts/`, authKey] : null,
    ([url, key]) => authenticatedFetcher(url, key)
  );

  return {
    prompts: data,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useMasterPrompt(id: number | null, authKey: string) {
  const { data, error, isLoading, mutate } = useSWR(
    authKey && id ? [`${config.serverUrl}/api/master-prompts/${id}/`, authKey] : null,
    ([url, key]) => authenticatedFetcher(url, key)
  );

  return {
    prompt: data,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useSystemMasterPrompt(authKey: string) {
  const { data, error, isLoading } = useSWR(
    authKey ? [`${config.serverUrl}/api/master-prompts/default/`, authKey] : null,
    ([url, key]) => authenticatedFetcher(url, key)
  );

  return {
    promptText: data?.prompt_text,
    isLoading,
    isError: error
  };
}



