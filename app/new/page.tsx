"use client";

import { useState } from "react";
import UrlForm from "../components/UrlForm";
import AuthModal from "../components/AuthModal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Card, CardBody } from "@heroui/card";
import { config } from "@/lib/config";
import { useRouter } from "next/navigation";
import { addToast } from "@heroui/toast";
import { useAuthContext } from "../contexts/AuthContext";

interface ScrapedDataItem {
  url: string;
  title: string;
  content: string;
  textLength: number;
  image?: string;
}

interface WorkflowResult {
  workflow_id: string;
  workflow_url: string;
  webhook_url?: string;
}

// Enhanced error logging
const logError = (context: string, error: any, additionalData?: any) => {
  console.error(`[${context}] Error:`, {
    message: error?.message || 'No error message',
    stack: error?.stack || 'No stack trace',
    timestamp: new Date().toISOString(),
    errorType: typeof error,
    errorName: error?.name || 'Unknown',
    errorToString: error?.toString() || 'No string representation',
    additionalData: additionalData || 'No additional data'
  });
  
  // Also log the raw error for debugging
  console.error(`[${context}] Raw error object:`, error);
  
  // If error is empty or has no useful information, log more details
  if (!error || Object.keys(error).length === 0 || !error.message) {
    console.error(`[${context}] Empty or invalid error object detected`);
    console.error(`[${context}] Error JSON:`, JSON.stringify(error, null, 2));
  }
};

// Enhanced API call wrapper with better error handling
const makeApiCall = async (url: string, options: RequestInit, context: string) => {
  try {
    console.log(`[${context}] Making API call to:`, url);
    console.log(`[${context}] Request options:`, {
      method: options.method,
      headers: options.headers,
      bodyLength: options.body ? options.body.toString().length : 0
    });
    
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`[${context}] Error response text:`, errorText);
      console.log(`[${context}] Error response status:`, response.status);
      console.log(`[${context}] Error response headers:`, Object.fromEntries(response.headers.entries()));
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
        console.log(`[${context}] Parsed error data:`, errorData);
      } catch (parseError) {
        console.log(`[${context}] Failed to parse error response as JSON:`, parseError);
        errorData = { error: errorText || `HTTP ${response.status}` };
      }
      
      const errorInfo = {
        url,
        status: response.status,
        statusText: response.statusText,
        errorData,
        errorText,
        responseHeaders: Object.fromEntries(response.headers.entries()),
        contentType: response.headers.get('content-type')
      };
      
      console.log(`[${context}] Complete error info:`, errorInfo);
      
      // Handle specific error cases
      let errorMessage;
      if (response.status === 500) {
        if (errorData?.error) {
          errorMessage = `Server error: ${errorData.error}`;
        } else if (errorText && errorText.length > 0) {
          errorMessage = `Server error: ${errorText}`;
        } else {
          errorMessage = "Internal server error occurred. Please try again or contact support if the issue persists.";
        }
      } else {
        errorMessage = errorData?.error || errorData?.message || errorData?.detail || errorText || `Request failed with status ${response.status}: ${response.statusText}`;
      }
      
      const apiError = new Error(errorMessage);
      // Add more context to the error object
      (apiError as any).status = response.status;
      (apiError as any).statusText = response.statusText;
      (apiError as any).errorData = errorData;
      (apiError as any).errorText = errorText;
      
      logError(context, apiError, errorInfo);
      
      throw apiError;
    }
    
    const data = await response.json();
    console.log(`[${context}] API call successful, response:`, data);
    return data;
  } catch (error: any) {
    console.error(`[${context}] Raw error:`, error);
    
    if (error.name === 'AbortError') {
      logError(context, error, { url, note: 'Request timeout' });
      throw new Error('Request timed out. The server might be busy processing your request. Please try again.');
    }
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      logError(context, error, { url, note: 'Network/CORS error' });
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    if (error.name === 'SyntaxError') {
      logError(context, error, { url, note: 'JSON parsing error' });
      throw new Error('Invalid response from server. Please try again.');
    }
    
    throw error;
  }
};

export default function NewProjectPage() {
  const { isAuthenticated, authKey, isLoading, login, logout } = useAuthContext();
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [step, setStep] = useState<"form" | "existing" | "selection" | "main_selection">("form");
  const [sitemapUrls, setSitemapUrls] = useState<{ url: string; selected: boolean }[]>([]);
  const [mainPageUrls, setMainPageUrls] = useState<{ url: string; main: boolean }[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [existingDataInfo, setExistingDataInfo] = useState<{
    count: number;
    existing_data: ScrapedDataItem[];
    existing_prompt?: string;
    existing_workflow?: WorkflowResult;
  } | null>(null);
  const [pageInfo, setPageInfo] = useState<{
    totalFound: number;
    limitedTo: number;
    methodUsed: string;
  } | null>(null);
  const [showPageLimitTips, setShowPageLimitTips] = useState(false);

  const clearMessages = () => {
    setErrorMessage("");
  };

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    "X-Auth-Key": authKey!,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      const message = "Please enter a valid URL";
      addToast({ title: "Error", description: message, color: "danger" });
      setErrorMessage(message);
      return;
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      const message = "Please enter a valid URL (including http:// or https://)";
      addToast({ title: "Error", description: message, color: "danger" });
      setErrorMessage(message);
      return;
    }

    setLoading(true);
    clearMessages();
    setSitemapUrls([]);
    setMainPageUrls([]);
    setExistingDataInfo(null);
    setPageInfo(null);
    setShowPageLimitTips(false);

    try {
      console.log("[handleSubmit] Starting submission process for URL:", url);
      
      // First check if domain already has data
      const checkData = await makeApiCall(
        `${config.serverUrl}/api/scrape/check-existing/`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ url }),
        },
        "check-existing"
      );

      if (checkData.has_existing_data) {
        console.log("[handleSubmit] Found existing data, showing existing data step");
        setExistingDataInfo({
          count: checkData.count,
          existing_data: checkData.existing_data,
          existing_prompt: checkData.existing_prompt,
          existing_workflow: checkData.existing_workflow
        });
        setStep("existing");
      } else {
        console.log("[handleSubmit] No existing data, fetching sitemap URLs");
        // No existing data, proceed with normal flow
        const data = await makeApiCall(
          `${config.serverUrl}/api/scrape/get-urls/`,
          {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ url }),
          },
          "get-urls"
        );

        if (!data.urls || data.urls.length === 0) {
          throw new Error("No URLs found in sitemap. The website might not have a sitemap or it might be empty.");
        }

        setSitemapUrls(data.urls.map((u: string) => ({ url: u, selected: true })));
        setPageInfo({
          totalFound: data.total_found || data.urls.length,
          limitedTo: data.limited_to || data.urls.length,
          methodUsed: data.method_used || 'sitemap'
        });
        
        // Set warning if pages were limited
        if (data.page_limit_warning) {
          addToast({ title: "Warning", description: data.page_limit_warning, color: "warning" });
          setShowPageLimitTips(true);
        }
        
        setStep("selection");
      }
    } catch (error: any) {
      logError("handleSubmit", error, { url });
      const message = error.message || "An unexpected error occurred while processing your request";
      addToast({ title: "Error", description: message, color: "danger" });
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const handleUseExistingData = () => {
    try {
      if (!url) {
        throw new Error("No URL available");
      }
      const domain = new URL(url).hostname;
      router.push(`/project/${domain}`);
    } catch (error: any) {
      logError("handleUseExistingData", error);
      const message = "Failed to load existing data";
      addToast({ title: "Error", description: message, color: "danger" });
      setErrorMessage(message);
    }
  };

  const handleRescanWebsite = async () => {
    setLoading(true);
    clearMessages();
    setMainPageUrls([]);
    setExistingDataInfo(null);
    setPageInfo(null);
    setShowPageLimitTips(false);

    try {
      console.log("[handleRescanWebsite] Rescanning website");
      const data = await makeApiCall(
        `${config.serverUrl}/api/scrape/get-urls/`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ url }),
        },
        "rescan-website"
      );

      if (!data.urls || data.urls.length === 0) {
        throw new Error("No URLs found in sitemap during rescan");
      }

      setSitemapUrls(data.urls.map((u: string) => ({ url: u, selected: true })));
      setPageInfo({
        totalFound: data.total_found || data.urls.length,
        limitedTo: data.limited_to || data.urls.length,
        methodUsed: data.method_used || 'sitemap'
      });
      
      // Set warning if pages were limited
      if (data.page_limit_warning) {
        addToast({ title: "Warning", description: data.page_limit_warning, color: "warning" });
        setShowPageLimitTips(true);
      }
      
      setStep("selection");
    } catch (error: any) {
      logError("handleRescanWebsite", error, { url });
      const message = error.message || "Failed to rescan website";
      addToast({ title: "Error", description: message, color: "danger" });
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToMainSelection = () => {
    const selectedUrls = sitemapUrls.filter(item => item.selected).map(item => item.url);

    if (selectedUrls.length === 0) {
      const message = "Please select at least one URL to scrape.";
      addToast({ title: "Error", description: message, color: "danger" });
      setErrorMessage(message);
      return;
    }

    // Initialize main page selection with smart defaults
    setMainPageUrls(selectedUrls.map(url => {
      const urlLower = url.toLowerCase();
      const isMainPage = urlLower.includes('/about') || 
                       urlLower.includes('/contact') || 
                       urlLower.includes('/service') || 
                       urlLower.includes('/home') || 
                       urlLower.includes('/faq') || 
                       urlLower.includes('/privacy') || 
                       urlLower.includes('/terms') ||
                       urlLower.includes('/policy') ||
                       url === new URL(url).origin + '/' ||
                       (!urlLower.includes('/blog/') && 
                        !urlLower.includes('/product/') && 
                        !urlLower.includes('/post/') && 
                        !urlLower.includes('/item/') &&
                        !urlLower.includes('/category/') &&
                        !urlLower.includes('/tag/') &&
                        !urlLower.match(/\/\d{4}\//) && // year in URL
                        !urlLower.match(/\/page\/\d+/)); // pagination
      return { url, main: isMainPage };
    }));
    
    setStep("main_selection");
  };


  const handleStartScraping = async () => {
    const selectedUrls = sitemapUrls.filter(item => item.selected).map(item => item.url);
    const unselectedUrls = sitemapUrls.filter(item => !item.selected).map(item => item.url);
    const mainUrls = mainPageUrls.filter(item => item.main).map(item => item.url);

    if (selectedUrls.length === 0) {
      const message = "Please select at least one URL to scrape.";
      addToast({ title: "Error", description: message, color: "danger" });
      setErrorMessage(message);
      return;
    }

    setLoading(true);
    clearMessages();

    try {
      console.log("[handleStartScraping] Starting scraping process for", selectedUrls.length, "URLs");
      
      const domain = new URL(url).hostname;
      
      // Blacklist unselected URLs
      if (unselectedUrls.length > 0) {
          try {
              console.log("[handleStartScraping] Blacklisting", unselectedUrls.length, "unselected URLs");
              
             try {
                const blacklistRes = await makeApiCall(
                    `${config.serverUrl}/api/scrape/blacklist/?domain=${domain}`,
                    { headers: getAuthHeaders(), method: "GET" },
                    "fetch-blacklist"
                );
                const existingBlacklist = blacklistRes.blacklist || [];
                const newBlacklist = [...existingBlacklist, ...unselectedUrls];
                const uniqueBlacklist = Array.from(new Set(newBlacklist));
                
                if (uniqueBlacklist.length > existingBlacklist.length) {
                     await makeApiCall(
                        `${config.serverUrl}/api/scrape/blacklist/`,
                        {
                            method: "POST",
                            headers: getAuthHeaders(),
                            body: JSON.stringify({ domain, blacklist: uniqueBlacklist }),
                        },
                        "save-blacklist"
                    );
                }
             } catch (e) {
                 console.warn("Error managing blacklist", e);
             }
          } catch (e) {
              console.warn("Failed to blacklist unselected URLs", e);
          }
      }
      
      const requestBody = { url, urls_to_scrape: selectedUrls, main_page_urls: mainUrls };
      console.log("[handleStartScraping] Request body:", requestBody);
      
      const result = await makeApiCall(
        `${config.serverUrl}/api/scrape/`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(requestBody),
        },
        "start-scraping"
      );

      console.log("[handleStartScraping] Scraping started:", result);
      
      if (result.job_id) {
          const domain = new URL(url).hostname;
          // Redirect to the scraping page immediately
          router.push(`/project/${domain}/scraping`);
      } else {
          // Fallback for synchronous response (should not happen with new backend)
          const domain = new URL(url).hostname;
          console.log("[handleStartScraping] Redirecting to project:", domain);
          router.push(`/project/${domain}`);
          setLoading(false);
      }

    } catch (error: any) {
      console.error("[handleStartScraping] Error caught:", error);
      console.error("[handleStartScraping] Error type:", typeof error);
      console.error("[handleStartScraping] Error name:", error?.name);
      console.error("[handleStartScraping] Error message:", error?.message);
      console.error("[handleStartScraping] Error stack:", error?.stack);
      
      logError("handleStartScraping", error, { 
        url, 
        selectedUrls,
        selectedUrlsCount: selectedUrls.length,
        errorType: typeof error,
        errorName: error?.name
      });
      
      // More specific error messages based on error type
      let userMessage = "Failed to scrape the selected pages";
      
      if (error?.message) {
        if (error.message.includes('Network error')) {
          userMessage = "Network error. Please check your connection and try again.";
        } else if (error.message.includes('timeout')) {
          userMessage = "Request timed out. The server might be busy. Please try again.";
        } else if (error.message.includes('500')) {
          userMessage = "Server error occurred while scraping. Please try again later.";
        } else if (error.message.includes('blocking automated requests') || error.message.includes('anti-bot protection')) {
          userMessage = "The website is blocking automated scraping. This website has protection against bots. Try selecting fewer pages, or this website may not be suitable for automated scraping.";
        } else if (error.message.includes('All') && error.message.includes('pages failed')) {
          userMessage = "Unable to scrape any pages from this website. The site may have anti-bot protection or be temporarily unavailable. Please try a different website.";
        } else {
          userMessage = error.message;
        }
      }
      
      addToast({ title: "Error", description: userMessage, color: "danger" });
      setErrorMessage(userMessage);
      setStep("selection"); // Revert to selection on error
      setLoading(false);
    }
  };

  const handleToggleUrlSelection = (urlToToggle: string) => {
    try {
      setSitemapUrls(prev =>
        prev.map(item =>
          item.url === urlToToggle ? { ...item, selected: !item.selected } : item
        )
      );
    } catch (error: any) {
      logError("handleToggleUrlSelection", error, { urlToToggle });
    }
  };

  const handleAddUrl = () => {
    try {
      if (!newUrl.trim()) {
        return;
      }

      // Validate URL format
      try {
        new URL(newUrl);
      } catch {
        const message = "Please enter a valid URL (including http:// or https://)";
        addToast({ title: "Error", description: message, color: "danger" });
        setErrorMessage(message);
        return;
      }

      // Check for duplicates
      if (sitemapUrls.some(item => item.url === newUrl)) {
        const message = "This URL is already in the list";
        addToast({ title: "Error", description: message, color: "danger" });
        setErrorMessage(message);
        return;
      }

      setSitemapUrls(prev => [...prev, { url: newUrl, selected: true }]);
      setNewUrl("");
    } catch (error: any) {
      logError("handleAddUrl", error, { newUrl });
      const message = "Failed to add URL";
      addToast({ title: "Error", description: message, color: "danger" });
      setErrorMessage(message);
    }
  };

  const handleSelectAll = (select: boolean) => {
    try {
      setSitemapUrls(prev => prev.map(item => ({ ...item, selected: select })));
    } catch (error: any) {
      logError("handleSelectAll", error, { select });
    }
  };

  const handleToggleMainSelection = (urlToToggle: string) => {
    try {
      const targetItem = mainPageUrls.find(item => item.url === urlToToggle);
      
      // Check limit before enabling a new one
      if (targetItem && !targetItem.main) {
          const currentSelected = mainPageUrls.filter(item => item.main).length;
          if (currentSelected >= 5) {
              alert("Maximum 5 main pages allowed.");
              return;
          }
      }

      setMainPageUrls(prev =>
        prev.map(item =>
          item.url === urlToToggle ? { ...item, main: !item.main } : item
        )
      );
    } catch (error: any) {
      logError("handleToggleMainSelection", error, { urlToToggle });
    }
  };

  const handleSelectAllMain = (select: boolean) => {
    try {
      if (select && mainPageUrls.length > 5) {
        alert("Cannot select all pages as main. Maximum 5 allowed. Please select individually.");
        return;
      }
      setMainPageUrls(prev => prev.map(item => ({ ...item, main: select })));
    } catch (error: any) {
      logError("handleSelectAllMain", error, { select });
    }
  };

  if (isLoading) {
    return (
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <div>Loading...</div>
      </section>
    );
  }

  return (
    <>
      <AuthModal 
        isOpen={!isAuthenticated} 
        onAuthenticate={login}
      />
      
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <div className="inline-block text-center justify-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">New Project</h1>
          <h2 className="text-lg md:text-xl text-muted-foreground">Enter your website URL to get started.</h2>
          <Button 
            size="sm" 
            variant="light" 
            onPress={() => router.push('/')}
            className="mt-2"
          >
            Back to Dashboard
          </Button>
        </div>

        {isAuthenticated && (
          <div className="w-full flex flex-col items-center gap-4">
            <UrlForm
              url={url}
              setUrl={setUrl}
              handleSubmit={handleSubmit}
              loading={loading}
              retryLoading={null}
            />
          </div>
        )}

        {step === 'existing' && existingDataInfo && (
          <Card className="w-full max-w-2xl">
            <CardBody className="flex flex-col gap-4">
              <h3 className="text-xl font-bold">Existing Data Found</h3>
              <p>This website has already been scanned with {existingDataInfo.count} pages.</p>
              <div className="flex gap-2">
                <Button 
                  color="primary" 
                  onClick={handleUseExistingData}
                >
                  Use Existing Data
                </Button>
                <Button 
                  variant="bordered" 
                  onClick={handleRescanWebsite}
                  isLoading={loading}
                >
                  Rescan Website
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {step === 'selection' && (
          <div className="w-full flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h3 className="text-xl font-bold">Select pages to scrape</h3>
              {pageInfo && (
                <div className="text-sm text-muted-foreground">
                  Found {pageInfo.totalFound} pages using {pageInfo.methodUsed === 'fallback_crawling' ? 'fallback crawling' : 'sitemap'}
                  {pageInfo.totalFound !== pageInfo.limitedTo && (
                    <span>, limited to {pageInfo.limitedTo} pages</span>
                  )}
                </div>
              )}
              <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
                <CardBody className="py-3">
                  <div className="flex items-start gap-2">
                    <div className="text-blue-600 dark:text-blue-400 mt-0.5">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">💡 Page Selection Tips</p>
                      <ul className="text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                        <li><strong>Select main pages</strong>: Home, About, Services, Contact, FAQ</li>
                        <li><strong>Skip individual posts/products</strong>: The AI can access these via your website's API or search</li>
                        <li><strong>Focus on static content</strong>: Policy pages, company info, service descriptions</li>
                        <li><strong>Limit: 200 pages maximum</strong> for optimal performance</li>
                      </ul>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleSelectAll(true)}>Select All</Button>
              <Button size="sm" onClick={() => handleSelectAll(false)}>Deselect All</Button>
              <Button 
                size="sm" 
                variant="bordered"
                onClick={() => {
                  // Smart selection: try to select main pages and deselect blog/product pages
                  setSitemapUrls(prev => prev.map(item => {
                    const url = item.url.toLowerCase();
                    const isMainPage = url.includes('/about') || 
                                     url.includes('/contact') || 
                                     url.includes('/service') || 
                                     url.includes('/home') || 
                                     url.includes('/faq') || 
                                     url.includes('/privacy') || 
                                     url.includes('/terms') ||
                                     url.includes('/policy') ||
                                     url === new URL(url).origin + '/' ||
                                     (!url.includes('/blog/') && 
                                      !url.includes('/product/') && 
                                      !url.includes('/post/') && 
                                      !url.includes('/item/') &&
                                      !url.includes('/category/') &&
                                      !url.includes('/tag/') &&
                                      !url.match(/\/\d{4}\//) && // year in URL
                                      !url.match(/\/page\/\d+/)); // pagination
                    return { ...item, selected: isMainPage };
                  }));
                }}
              >
                Smart Select
              </Button>
            </div>
            <div className="max-h-64 overflow-y-auto border rounded-md">
              <table className="w-full">
                <thead className="sticky top-0 bg-gray-800 dark:bg-gray-900 border-b border-gray-600">
                  <tr>
                    <th className="w-12 text-left">
                      <input
                        type="checkbox"
                        checked={sitemapUrls.length > 0 && sitemapUrls.every(item => item.selected)}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded ml-2"
                        aria-label="Select all URLs"
                      />
                    </th>
                    <th className="text-left text-sm font-medium pl-2">URL</th>
                  </tr>
                </thead>
                <tbody>
                  {sitemapUrls.map((item, index) => (
                    <tr key={`${item.url}-${index}`} className="border-b border-gray-600 hover:bg-gray-700 dark:hover:bg-gray-800">
                      <td>
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => handleToggleUrlSelection(item.url)}
                          className="rounded ml-2"
                          aria-label={`Select ${item.url}`}
                        />
                      </td>
                      <td className="text-sm pl-2" title={item.url}>
                        {item.url}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <Input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="Add another URL (include http:// or https://)"
                onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
                isInvalid={newUrl.trim() !== "" && !/^https?:\/\//.test(newUrl)}
                errorMessage={newUrl.trim() !== "" && !/^https?:\/\//.test(newUrl) ? "Please enter a valid URL" : ""}
              />
              <Button 
                onClick={handleAddUrl}
                disabled={newUrl.trim() === "" || !/^https?:\/\//.test(newUrl) || sitemapUrls.some(item => item.url === newUrl)}
              >
                Add
              </Button>
            </div>
            <Button
              color="primary"
              onClick={handleProceedToMainSelection}
              disabled={loading}
            >
              Next: Select Main Pages ({sitemapUrls.filter(u => u.selected).length} pages)
            </Button>
          </div>
        )}

        {step === 'main_selection' && (
          <div className="w-full flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h3 className="text-xl font-bold">Select Main Pages</h3>
              <p className="text-sm text-muted-foreground">
                Main pages will be always available to the shopping assistant as context, while other pages will be vectorized for semantic search.
              </p>
              <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
                <CardBody className="py-3">
                  <div className="flex items-start gap-2">
                    <div className="text-green-600 dark:text-green-400 mt-0.5">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-green-800 dark:text-green-200 mb-1">💡 Main Pages Guidelines</p>
                      <ul className="text-green-700 dark:text-green-300 space-y-1 list-disc list-inside">
                        <li><strong>Always available</strong>: Main pages are always accessible to the AI as context</li>
                        <li><strong>Static content</strong>: Choose pages with core business information</li>
                        <li><strong>Essential pages</strong>: Home, About, Services, Contact, FAQ, Policies</li>
                        <li><strong>Limit recommendation</strong>: Maximum 5 main pages allowed for optimal performance</li>
                      </ul>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleSelectAllMain(true)}>Select All as Main</Button>
              <Button size="sm" onClick={() => handleSelectAllMain(false)}>Deselect All Main</Button>
              <Button 
                size="sm" 
                variant="bordered"
                onClick={() => {
                  // Smart selection for main pages
                  setMainPageUrls(prev => {
                    let count = 0;
                    return prev.map(item => {
                      const url = item.url.toLowerCase();
                      let isMainPage = url.includes('/about') || 
                                     url.includes('/contact') || 
                                     url.includes('/service') || 
                                     url.includes('/home') || 
                                     url.includes('/faq') || 
                                     url.includes('/privacy') || 
                                     url.includes('/terms') ||
                                     url.includes('/policy') ||
                                     item.url === new URL(item.url).origin + '/' ||
                                     (!url.includes('/blog/') && 
                                      !url.includes('/product/') && 
                                      !url.includes('/post/') && 
                                      !url.includes('/item/') &&
                                      !url.includes('/category/') &&
                                      !url.includes('/tag/') &&
                                      !url.match(/\/\d{4}\//) && // year in URL
                                      !url.match(/\/page\/\d+/)); // pagination

                      // Limit to 5 main pages
                      if (isMainPage) {
                        if (count < 5) {
                          count++;
                        } else {
                          isMainPage = false;
                        }
                      }
                      
                      return { ...item, main: isMainPage };
                    });
                  });
                }}
              >
                Smart Select Main
              </Button>
            </div>
            <div className="max-h-64 overflow-y-auto border rounded-md">
              <table className="w-full">
                <thead className="sticky top-0 bg-gray-800 dark:bg-gray-900 border-b border-gray-600">
                  <tr>
                    <th className="w-12 text-left">
                      <input
                        type="checkbox"
                        checked={mainPageUrls.length > 0 && mainPageUrls.every(item => item.main)}
                        onChange={(e) => handleSelectAllMain(e.target.checked)}
                        className="rounded ml-2"
                        aria-label="Select all URLs as main"
                      />
                    </th>
                    <th className="text-left text-sm font-medium pl-2">URL</th>
                    <th className="text-left text-sm font-medium pl-2">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {mainPageUrls.map((item, index) => (
                    <tr key={`${item.url}-${index}`} className="border-b border-gray-600 hover:bg-gray-700 dark:hover:bg-gray-800">
                      <td>
                        <input
                          type="checkbox"
                          checked={item.main}
                          onChange={() => handleToggleMainSelection(item.url)}
                          className="rounded ml-2"
                          aria-label={`Select ${item.url} as main`}
                        />
                      </td>
                      <td className="text-sm pl-2" title={item.url}>
                        {item.url}
                      </td>
                      <td className="text-sm pl-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          item.main 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        }`}>
                          {item.main ? 'Main' : 'Vectorized'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2 justify-between">
              <Button
                variant="bordered"
                onClick={() => setStep("selection")}
              >
                Back to Page Selection
              </Button>
              <Button
                color="primary"
                onClick={handleStartScraping}
                isLoading={loading}
                disabled={loading}
              >
                Scrape {sitemapUrls.filter(u => u.selected).length} Pages ({mainPageUrls.filter(u => u.main).length} main, {mainPageUrls.filter(u => !u.main).length} vectorized)
              </Button>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="w-full max-w-2xl">
            
            {/* Show helpful tips for common scraping issues */}
            {errorMessage && (
              errorMessage.includes('blocking') || 
              errorMessage.includes('anti-bot') || 
              errorMessage.includes('failed to scrape')
            ) && (
              <Card className="mt-4">
                <CardBody className="flex flex-col gap-3">
                  <h4 className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                    Scraping Tips
                  </h4>
                  <div className="text-sm space-y-2">
                    <p>• Some websites block automated scraping to protect their content</p>
                    <p>• Try selecting fewer pages (5-10 main pages) instead of all pages</p>
                    <p>• Focus on static pages like About, Services, Contact rather than blog posts</p>
                    <p>• Government and news websites often have stronger protection</p>
                    <p>• Consider trying a different website that's more scraping-friendly</p>
                    <p>• Blogs, documentation sites, and business websites typically work better</p>
                  </div>
                </CardBody>
              </Card>
            )}
            
            {/* Show page limit guidance */}
            {showPageLimitTips && (
              <Card className="mt-4">
                <CardBody className="flex flex-col gap-3">
                  <h4 className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                    📄 Page Limit Reached
                  </h4>
                  <div className="text-sm space-y-2">
                    <p>• <strong>200 page limit</strong> helps ensure fast performance and quality results</p>
                    <p>• <strong>Use "Smart Select"</strong> to automatically choose main pages</p>
                    <p>• <strong>Deselect blog posts/products</strong> - the AI can access these dynamically via your API</p>
                    <p>• <strong>Focus on core content</strong> that defines your business and services</p>
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        )}
      </section>
    </>
  );
}