"use client";

import { useEffect, useState } from "react";
import { config } from "@/lib/config";
import ActionButtons from "@/app/components/ActionButtons";
import { useRouter, useParams } from "next/navigation";
import { addToast } from "@heroui/toast";
import { useAuthContext } from "@/app/contexts/AuthContext";
import { Button } from "@heroui/button";
import { Link } from "@heroui/link";
import ScrapingHistoryModal from "@/app/components/ScrapingHistoryModal";

interface ScrapedDataItem {
  url: string;
  title: string;
  content: string;
  textLength: number;
  main?: boolean;
  image?: string;
}

// Enhanced error logging
const logError = (context: string, error: any, additionalData?: any) => {
  console.error(`[${context}] Error:`, {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    additionalData
  });
};

// Enhanced API call wrapper with better error handling
const makeApiCall = async (url: string, options: RequestInit, context: string) => {
  try {
    console.log(`[${context}] Making API call to:`, url);
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || `HTTP ${response.status}` };
      }
      
      logError(context, new Error(`API call failed: ${response.status}`), {
        url,
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`[${context}] API call successful`);
    return data;
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      logError(context, error, { url, note: 'Network/CORS error' });
      throw new Error('Network error. Please check your connection and try again.');
    }
    throw error;
  }
};

export default function ScrapingPage() {
  const params = useParams();
  const domain = params.domain as string;
  const { isAuthenticated, authKey, isLoading: authIsLoading } = useAuthContext();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [retryLoading, setRetryLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [useAI, setUseAI] = useState(false);
  const [retryCount, setRetryCount] = useState(3);
  const [retryDelay, setRetryDelay] = useState(1.0);
  const [isRetryModalOpen, setIsRetryModalOpen] = useState(false);
  const [scrapedData, setScrapedData] = useState<ScrapedDataItem[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [scrapingProgress, setScrapingProgress] = useState<{ 
    current: number; 
    total: number; 
    status: string; 
    currentUrl?: string;
    pageStatuses?: { url: string; status: string; error?: string; status_code?: number }[];
  } | null>(null);

  const url = `http://${domain}`;

  const clearMessages = () => {
    setErrorMessage("");
  };

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    "X-Auth-Key": authKey!,
  });

  useEffect(() => {
    const loadProjectData = async () => {
      if (!authKey || !domain) return;

      setLoading(true);
      clearMessages();

      try {
        console.log("[ScrapingPage] Loading project data for:", domain);
        
        const checkData = await makeApiCall(
          `${config.serverUrl}/api/scrape/check-existing/`,
          {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ url: `http://${domain}` }),
          },
          "project-load"
        );

        if (checkData.active_job) {
            console.log("Found active scraping job:", checkData.active_job);
            setRetryLoading('scraping');
            setActiveJobId(checkData.active_job.id);
            pollScrapingStatus(checkData.active_job.id);
        }

        if (checkData.has_existing_data) {
          setScrapedData(checkData.existing_data || []);
        }
      } catch (error: any) {
        logError("loadProjectData", error, { domain });
        const message = error.message || "Failed to load project data";
        addToast({ title: "Error", description: message, color: "danger" });
        setErrorMessage(message);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      loadProjectData();
    }
  }, [isAuthenticated, domain, authKey]);

  const pollScrapingStatus = async (jobId: string) => {
    const poll = async () => {
      try {
        const statusData = await makeApiCall(
          `${config.serverUrl}/api/scrape/status/${jobId}/`,
          {
            method: "GET",
            headers: getAuthHeaders(),
          },
          "poll-status"
        );

        setScrapingProgress({
            current: statusData.scraped_pages,
            total: statusData.total_pages,
            status: statusData.status,
            currentUrl: statusData.current_url,
            pageStatuses: statusData.page_statuses
        });

        if (statusData.status === 'completed') {
            setRetryLoading(null);
            setScrapingProgress(null);
            setActiveJobId(null);
            addToast({ title: "Success", description: "Scraping completed", color: "success" });
            router.push(`/project/${domain}`);
        } else if (statusData.status === 'failed') {
            setRetryLoading(null);
            setScrapingProgress(null);
            setActiveJobId(null);
            setErrorMessage(statusData.error_message || "Scraping failed");
            addToast({ title: "Error", description: statusData.error_message || "Scraping failed", color: "danger" });
        } else if (statusData.status === 'cancelled') {
            setRetryLoading(null);
            setScrapingProgress(null);
            setActiveJobId(null);
            addToast({ title: "Cancelled", description: "Scraping job was cancelled", color: "warning" });
        } else {
            setTimeout(poll, 2000);
        }
      } catch (e) {
          console.error("Polling failed", e);
          setTimeout(poll, 5000);
      }
    };
    poll();
  };

  const handleOpenRetryModal = () => {
      setIsRetryModalOpen(true);
  };

  const handleRescrapePages = async (urlsToRescrape: string[]) => {
    if (urlsToRescrape.length === 0) return;

    setRetryLoading('scraping');
    setIsRetryModalOpen(false);
    clearMessages();
    setScrapingProgress({ current: 0, total: urlsToRescrape.length, status: 'pending' });

    try {
      console.log("[handleRescrapePages] Re-scraping pages:", urlsToRescrape.length);
      const data = await makeApiCall(
        `${config.serverUrl}/api/scrape/additional/`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ 
            url, 
            additional_urls: urlsToRescrape,
            force_rescrape: true,
            retry_count: retryCount,
            retry_delay: retryDelay,
            use_ai: useAI
          }),
        },
        "rescrape-pages"
      );

      if (data.job_id) {
          addToast({
            title: "Started",
            description: "Re-scraping started in background...",
            color: "primary",
          });
          setActiveJobId(data.job_id);
          pollScrapingStatus(data.job_id);
      } else {
          addToast({
            title: "Success",
            description: data.message || "Pages re-scraped successfully",
            color: "success",
          });
          
          // Reload project data to show updated content
          const checkData = await makeApiCall(
            `${config.serverUrl}/api/scrape/check-existing/`,
            {
              method: "POST",
              headers: getAuthHeaders(),
              body: JSON.stringify({ url }),
            },
            "reload-project-data"
          );

          if (checkData.has_existing_data) {
            setScrapedData(checkData.existing_data || []);
          }
          setRetryLoading(null);
          setScrapingProgress(null);
      }
    } catch (error: any) {
      logError("handleRescrapePages", error, { url, urlsToRescrape });
      const message = error.message || "Failed to re-scrape pages";
      addToast({ title: "Error", description: message, color: "danger" });
      setErrorMessage(message);
      setRetryLoading(null);
      setScrapingProgress(null);
    }
  };

  const handleRetryScraping = async (forceRescrape = false) => {
    setRetryLoading('scraping');
    clearMessages();
    setScrapingProgress({ current: 0, total: 0, status: 'pending' });

    try {
      console.log("[handleRetryScraping] Retrying scraping, force:", forceRescrape, "use_ai:", useAI);
      const data = await makeApiCall(
        `${config.serverUrl}/api/scrape/retry/`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ 
            url, 
            force_rescrape: forceRescrape, 
            use_ai: useAI,
            retry_count: retryCount,
            retry_delay: retryDelay
          }),
        },
        "retry-scraping"
      );

      if (data.job_id) {
          addToast({
            title: "Started",
            description: "Scraping started in background...",
            color: "primary",
          });
          setActiveJobId(data.job_id);
          pollScrapingStatus(data.job_id);
      } else {
          // Fallback for synchronous response
          addToast({
            title: "Success",
            description: data.message || "Scraping retry completed",
            color: "success",
          });
          setRetryLoading(null);
          setScrapingProgress(null);
          router.push(`/project/${domain}`);
      }

    } catch (error: any) {
      logError("handleRetryScraping", error, { url, forceRescrape });
      const message = error.message || "Failed to retry scraping";
      addToast({ title: "Error", description: message, color: "danger" });
      setErrorMessage(message);
      setRetryLoading(null);
      setScrapingProgress(null);
    }
  };

  const handleSmartRescrapeImages = async () => {
    setRetryLoading('smart-images');
    clearMessages();

    try {
      console.log("[handleSmartRescrapeImages] Starting smart re-scrape, use_ai:", useAI);
      const data = await makeApiCall(
        `${config.serverUrl}/api/scrape/smart-images/`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ url, use_ai: useAI }),
        },
        "smart-rescrape-images"
      );

      addToast({
        title: "Success",
        description: data.message || "Pages updated successfully",
        color: "success",
      });
      
      if (data.completion_percentage !== undefined) {
        addToast({
          title: "Update Summary",
          description: `${data.completion_percentage}% of pages now have images (${data.pages_with_images}/${data.total_pages})`,
          color: "secondary",
        });
      }
      
      if (data.warnings) {
        addToast({
          title: "Warning",
          description: data.warnings,
          color: "warning",
        });
      }
      
      router.push(`/project/${domain}`);

    } catch (error: any) {
      logError("handleSmartRescrapeImages", error, { url });
      const message = error.message || "Failed to update pages";
      addToast({ title: "Error", description: message, color: "danger" });
      setErrorMessage(message);
    } finally {
      setRetryLoading(null);
    }
  };

  const handleStopScraping = async () => {
    if (!activeJobId) return;
    
    try {
      await makeApiCall(
        `${config.serverUrl}/api/scrape/cancel/`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ job_id: activeJobId }),
        },
        "stop-scraping"
      );
      addToast({ title: "Stopping", description: "Scraping job cancellation requested...", color: "warning" });
    } catch (error: any) {
      logError("handleStopScraping", error, { activeJobId });
      addToast({ title: "Error", description: "Failed to stop scraping", color: "danger" });
    }
  };

  if (authIsLoading) {
    return (
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <div>Loading...</div>
      </section>
    );
  }

  return (
    <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
      <div className="inline-block text-center justify-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Scraping: {domain}</h1>
        <h2 className="text-lg md:text-xl text-muted-foreground">Manage scraping jobs and view progress.</h2>
      </div>

      <div className="w-full max-w-4xl flex justify-start mb-4">
        <Button as={Link} href={`/project/${domain}`} variant="light" startContent={<span>←</span>}>
          Back to Dashboard
        </Button>
      </div>

      {isAuthenticated && (loading ? (
          <div>Loading scraping data...</div>
      ) : (
        <>
          <ActionButtons
            scrapedDataLength={1} // Always show buttons
            errorMessage={errorMessage}
            url={url}
            handleRetryScraping={handleRetryScraping}
            handleOpenRetryModal={handleOpenRetryModal}
            handleSmartRescrapeImages={handleSmartRescrapeImages}
            handleStopScraping={handleStopScraping}
            loading={loading}
            retryLoading={retryLoading}
            useAI={useAI}
            setUseAI={setUseAI}
            retryCount={retryCount}
            setRetryCount={setRetryCount}
            retryDelay={retryDelay}
            setRetryDelay={setRetryDelay}
          />
          
          <ScrapingHistoryModal
            isOpen={isRetryModalOpen}
            onClose={() => setIsRetryModalOpen(false)}
            scrapedData={scrapedData}
            onRescrape={handleRescrapePages}
            isLoading={retryLoading === 'scraping'}
          />
          
          {scrapingProgress && (
            <div className="w-full max-w-4xl mt-4 p-4 border rounded-lg bg-content1">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Scraping Progress</span>
                <span className="text-sm text-default-500">
                  {scrapingProgress.current} / {scrapingProgress.total} pages
                </span>
              </div>
              <div className="w-full bg-default-200 rounded-full h-2.5 mb-2">
                <div 
                  className="bg-primary h-2.5 rounded-full transition-all duration-500" 
                  style={{ width: `${(scrapingProgress.current / Math.max(scrapingProgress.total, 1)) * 100}%` }}
                ></div>
              </div>
              <p className="text-xs text-default-400 truncate mb-2">
                {scrapingProgress.status === 'completed' ? 'Completed!' : 
                 scrapingProgress.status === 'failed' ? 'Failed' :
                 `Processing: ${scrapingProgress.currentUrl || 'Initializing...'}`}
              </p>
              
              {scrapingProgress.pageStatuses && (
                <div className="mt-2 max-h-[500px] overflow-y-auto border rounded text-xs">
                  <table className="w-full">
                    <thead className="bg-default-100 sticky top-0">
                      <tr>
                        <th className="p-2 text-left">URL</th>
                        <th className="p-2 text-right">Status</th>
                        <th className="p-2 text-right">Code</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scrapingProgress.pageStatuses.slice().reverse().map((page, idx) => (
                        <tr key={idx} className="border-b border-default-200 hover:bg-default-50">
                          <td className="p-2 truncate max-w-[400px]" title={page.url}>{page.url}</td>
                          <td className={`p-2 text-right font-medium ${
                            page.status === 'success' ? 'text-success' : 
                            page.status === 'failed' ? 'text-danger' : 'text-warning'
                          }`}>
                            {page.status}
                          </td>
                          <td className="p-2 text-right font-mono">{page.status_code || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      ))}
    </section>
  );
}
