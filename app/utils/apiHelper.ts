/**
 * Build the authorization headers for API requests.
 * Uses Bearer token (Supabase JWT).
 */
export const getAuthHeaders = (accessToken: string | null): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  return headers;
};

export const logError = (context: string, error: any, additionalData?: any) => {
  console.error(`[${context}] Error Object:`, error);
  console.error(`[${context}] Error Details:`, {
    message: error?.message,
    stack: error?.stack,
    timestamp: new Date().toISOString(),
    additionalData
  });
};

export const makeApiCall = async (url: string, options: RequestInit, context: string) => {
  try {
    console.log(`[${context}] Making API call to:`, url);
    const response = await fetch(url, options);
    
    // Check if response is JSON
    const contentType = response.headers.get("content-type");
    let data;
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
        try {
            data = await response.json();
        } catch {
             data = { text: await response.text() };
        }
    }

    if (!response.ok) {
      console.error(`[${context}] API Error:`, {
        status: response.status,
        statusText: response.statusText,
        data
      });
      throw new Error(data?.error || data?.message || `API Error: ${response.status} ${response.statusText}`);
    }

    console.log(`[${context}] API Success:`, { status: response.status });
    return data;
  } catch (error: any) {
    logError(context, error, { url });
    throw error;
  }
};
