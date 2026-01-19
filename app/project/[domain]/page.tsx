"use client";

import { useEffect, useState, useRef } from "react";
import { config } from "@/lib/config";
import ResultsDisplay from "@/app/components/ResultsDisplay";
import AuthModal from "@/app/components/AuthModal";
import { useRouter, useParams } from "next/navigation";
import { addToast } from "@heroui/toast";
import { useAuthContext } from "@/app/contexts/AuthContext";
import { Button } from "@heroui/button";

import { Link } from "@heroui/link";
import { Card, CardBody } from "@heroui/card";
import { useProjectData, useWebhookSecret, invalidateProjectCache, useAdditionalUrls } from "@/app/utils/swr";

interface ScrapedDataItem {
  url: string;
  title: string;
  content: string;
  textLength: number;
  main?: boolean;
  image?: string;
}

interface SelectedScrapedDataItem extends ScrapedDataItem {
  selected: boolean;
}

interface WorkflowResult {
  workflow_id: string;
  workflow_url: string;
  webhook_url?: string;
}

// Enhanced error logging
const logError = (context: string, error: any, additionalData?: any) => {
  console.error(`[${context}] Error Object:`, error);
  console.error(`[${context}] Error Details:`, {
    message: error?.message,
    stack: error?.stack,
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
      console.error(`[${context}] API Error Response Body:`, errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || `HTTP ${response.status}` };
      }
      
      logError(context, new Error(errorData.error || `API call failed: ${response.status}`), {
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

export default function ProjectPage() {
  const params = useParams();
  const domain = params.domain as string;
  const { isAuthenticated, authKey, isLoading: authIsLoading, login } = useAuthContext();
  const router = useRouter();
  
  // SWR Hooks
  const { projectData, isLoading: projectIsLoading, error: projectError } = useProjectData(domain, authKey);
  const { secret: cachedSecret } = useWebhookSecret(
    domain, 
    authKey, 
    !!projectData?.existing_workflow // Only fetch if workflow exists
  );

  const [loading, setLoading] = useState(true);
  const [retryLoading, setRetryLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [scrapedData, setScrapedData] = useState<SelectedScrapedDataItem[]>([]);
  const [prompt, setPrompt] = useState("");
  const [savedPrompt, setSavedPrompt] = useState(""); // Track saved state for comparison
  const [workflowResult, setWorkflowResult] = useState<WorkflowResult | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [showAddMorePages, setShowAddMorePages] = useState(false);
  const [additionalUrls, setAdditionalUrls] = useState<{ url: string; selected: boolean }[]>([]);
  const [useAI, setUseAI] = useState(false); // AI toggle for image extraction
  const [retryCount, setRetryCount] = useState(3);
  const [retryDelay, setRetryDelay] = useState(1.0);
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);
  const [lastSmartUpdate, setLastSmartUpdate] = useState<string | null>(null);
  const [scrapingProgress, setScrapingProgress] = useState<{ 
    current: number; 
    total: number; 
    status: string; 
    currentUrl?: string;
    pageStatuses?: { url: string; status: string; error?: string; status_code?: number }[];
  } | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Ref to track the active polling job to prevent duplicate loops
  const pollingJobRef = useRef<string | null>(null);

  const url = `http://${domain}`;

  const clearMessages = () => {
    setErrorMessage("");
  };

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    "X-Auth-Key": authKey!,
  });

  // Effect to sync SWR data with local state
  useEffect(() => {
    if (projectIsLoading) return;
    setLoading(projectIsLoading);

    if (projectError) {
      logError("loadProjectData", projectError, { domain });
      const message = projectError.message || "Failed to load project data";
      addToast({ title: "Error", description: message, color: "danger" });
      setErrorMessage(message);
      return;
    }

    if (!projectData) return;
    
    // Handle data loaded successfully
    console.log("[ProjectPage] Project data loaded:", domain);
    
    if (projectData.active_job) {
        // Only start polling if not already polling this job
        if (pollingJobRef.current !== projectData.active_job.id) {
            console.log("Found active scraping job, starting poll:", projectData.active_job.id);
            pollScrapingStatus(projectData.active_job.id);
        }
    } else {
        // If no active job, ensure we stop polling (e.g. if we navigated back to a completed state)
        if (pollingJobRef.current) {
            console.log("No active job reported, stopping local poll");
            pollingJobRef.current = null;
        }
    }

    if (projectData.has_existing_data) {
      setScrapedData((projectData.existing_data || []).map((item: ScrapedDataItem) => ({ ...item, selected: false })));
      
      const newPrompt = projectData.existing_prompt || "";
      // Only update prompt if it hasn't been edited by user yet
      setPrompt(prev => prev === "" ? newPrompt : prev);
      setSavedPrompt(newPrompt);

      if (projectData.existing_workflow) {
        setWorkflowResult(projectData.existing_workflow);
      }
      
      if (projectData.last_smart_update) {
         setLastSmartUpdate(projectData.last_smart_update);
      }
    } else if (!projectData.active_job && !loading) { // Only redirect if fully loaded and no job
      const message = "No data found for this project. Redirecting to home page.";
      addToast({ title: "Error", description: message, color: "danger" });
      setErrorMessage(message);
      setTimeout(() => router.push('/'), 3000);
    }
  }, [projectData, projectIsLoading, projectError, domain, router]);

  // Sync webhook secret when it loads
  useEffect(() => {
    if (cachedSecret) setWebhookSecret(cachedSecret);
  }, [cachedSecret]);

  const handleScrapeAdditionalPages = async () => {
    const selectedAdditionalUrls = additionalUrls.filter(item => item.selected).map(item => item.url);
    
    if (selectedAdditionalUrls.length === 0) {
      const message = "Please select at least one additional URL to scrape.";
      addToast({ title: "Error", description: message, color: "danger" });
      setErrorMessage(message);
      return;
    }

    setRetryLoading('additional');
    clearMessages();

    try {
      console.log("[handleScrapeAdditionalPages] Scraping additional pages:", selectedAdditionalUrls.length);
      const data = await makeApiCall(
        `${config.serverUrl}/api/scrape/additional/`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ 
            url, 
            additional_urls: selectedAdditionalUrls 
          }),
        },
        "scrape-additional"
      );

      setScrapedData((data.all_data || []).map((item: ScrapedDataItem) => ({ ...item, selected: false })));
      setPrompt(data.prompt || "");
      
      // Invalidate cache to reflect new data
      invalidateProjectCache(domain);

      addToast({
        title: "Success",
        description: data.message || "Additional pages scraped successfully",
        color: "success",
      });
      if (data.warnings) {
        addToast({
          title: "Warning",
          description: data.warnings,
          color: "warning",
        });
      }
      setShowAddMorePages(false);
      setAdditionalUrls([]);
    } catch (error: any) {
      logError("handleScrapeAdditionalPages", error, { url, selectedUrls: selectedAdditionalUrls });
      const message = error.message || "Failed to scrape additional pages";
      addToast({ title: "Error", description: message, color: "danger" });
      setErrorMessage(message);
    } finally {
      setRetryLoading(null);
    }
  };

  const handleShowAddMorePages = async () => {
    setLoading(true);
    clearMessages();

    try {
      console.log("[handleShowAddMorePages] Fetching additional URLs");
      const data = await makeApiCall(
        `${config.serverUrl}/api/scrape/get-urls/`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ url }),
        },
        "show-add-more-pages"
      );

      // Filter out URLs that are already scraped
      const existingUrls = new Set(scrapedData.map(item => item.url));
      const newUrls = (data.urls || []).filter((u: string) => !existingUrls.has(u));
      
      if (newUrls.length === 0) {
        addToast({
          title: "Info",
          description: "No new pages found in the sitemap that haven't been scraped yet.",
          color: "primary",
        });
        setShowAddMorePages(true); // Still show the UI to allow manual entry
        setAdditionalUrls([]);
        return;
      }
      
      setAdditionalUrls(newUrls.map((u: string) => ({ url: u, selected: true })));
      setShowAddMorePages(true);
    } catch (error: any) {
      logError("handleShowAddMorePages", error, { url });
      const message = error.message || "Failed to fetch additional pages";
      addToast({ title: "Error", description: message, color: "danger" });
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const pollScrapingStatus = async (jobId: string) => {
    // Determine if this is a new poll or continuing an existing one
    if (pollingJobRef.current !== jobId) {
      pollingJobRef.current = jobId;
      setRetryLoading('scraping');
    }

    const poll = async () => {
      // Stop polling if the job ID has changed (e.g. cancelled or new job started)
      if (pollingJobRef.current !== jobId) {
          console.log(`[pollScrapingStatus] Stopping poll for job ${jobId} (current: ${pollingJobRef.current})`);
          return;
      }

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
            pollingJobRef.current = null; // Clean up
            addToast({ title: "Success", description: "Scraping completed", color: "success" });
            
            // Reload project data via SWR cache invalidation
            invalidateProjectCache(domain);

        } else if (statusData.status === 'failed') {
            setRetryLoading(null);
            setScrapingProgress(null);
            pollingJobRef.current = null; // Clean up
            setErrorMessage(statusData.error_message || "Scraping failed");
            addToast({ title: "Error", description: statusData.error_message || "Scraping failed", color: "danger" });
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
          pollScrapingStatus(data.job_id);
      } else {
          // Fallback for synchronous response
          addToast({
            title: "Success",
            description: data.message || "Scraping retry completed",
            color: "success",
          });
          if (data.warnings) {
            addToast({
              title: "Warning",
              description: data.warnings,
              color: "warning",
            });
          }
          if (data.scraped_data) {
            setScrapedData(data.scraped_data.map((item: ScrapedDataItem) => ({ ...item, selected: false })));
          }
          if (data.prompt) {
            setPrompt(data.prompt);
          }
          if (data.sheet_id) {
            setSheetId(data.sheet_id);
          }
          
          invalidateProjectCache(domain);
          
          setRetryLoading(null);
          setScrapingProgress(null);
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

      // Reload project data to show updated content
      invalidateProjectCache(domain);
      
    } catch (error: any) {
      logError("handleSmartRescrapeImages", error, { url });
      const message = error.message || "Failed to update pages";
      addToast({ title: "Error", description: message, color: "danger" });
      setErrorMessage(message);
    } finally {
      setRetryLoading(null);
    }
  };

  const handleRegeneratePrompt = async () => {
    setRetryLoading('prompt');
    clearMessages();
    
    try {
      console.log("[handleRegeneratePrompt] Regenerating prompt for domain:", domain);
      
      const data = await makeApiCall(
        `${config.serverUrl}/api/scrape/regenerate/`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ domain }),
        },
        "regenerate-prompt"
      );

      setPrompt(data.prompt || "");
      setSavedPrompt(data.prompt || ""); // Update saved state after regeneration
      
      // Update cache
      invalidateProjectCache(domain);

      addToast({
        title: "Success",
        description: data.message || "Prompt regenerated successfully",
        color: "success",
      });
    } catch (error: any) {
      logError("handleRegeneratePrompt", error, { url });
      const message = error.message || "Failed to regenerate prompt";
      addToast({ title: "Error", description: message, color: "danger" });
      setErrorMessage(message);
    } finally {
      setRetryLoading(null);
    }
  };

  const handleSavePromptToWorkflow = async () => {
    if (!prompt.trim()) {
      const message = "Cannot save empty prompt";
      addToast({ title: "Error", description: message, color: "danger" });
      return;
    }

    if (!workflowResult?.workflow_id) {
      const message = "No workflow exists. Please create a workflow first.";
      addToast({ title: "Error", description: message, color: "danger" });
      return;
    }

    setRetryLoading('save-prompt');
    clearMessages();
    
    try {
      console.log("[handleSavePromptToWorkflow] Saving prompt for domain:", domain);
      
      const data = await makeApiCall(
        `${config.serverUrl}/api/workflow/prompt/`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({ domain, prompt }),
        },
        "save-prompt-to-workflow"
      );

      setSavedPrompt(prompt); // Update saved state after successful save
      addToast({
        title: "Success",
        description: data.message || "Prompt saved to workflow successfully",
        color: "success",
      });
    } catch (error: any) {
      logError("handleSavePromptToWorkflow", error, { domain, promptLength: prompt.length });
      const message = error.message || "Failed to save prompt to workflow";
      addToast({ title: "Error", description: message, color: "danger" });
      setErrorMessage(message);
    } finally {
      setRetryLoading(null);
    }
  };

  const handleCreateWorkflow = async () => {
    setRetryLoading('workflow');
    clearMessages();
    
    try {
      console.log("[handleCreateWorkflow] Creating workflow for domain:", domain);
      
      const data = await makeApiCall(
        `${config.serverUrl}/api/workflow/create/`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ domain, prompt }),
        },
        "create-workflow"
      );

      setWorkflowResult({
        workflow_id: data.workflow_id,
        workflow_url: data.workflow_url,
        webhook_url: data.webhook_url
      });
      
      // Update cache
      invalidateProjectCache(domain);

      setSavedPrompt(prompt); // Prompt is now saved with the new workflow
      addToast({
        title: "Success",
        description: data.message || "Workflow created successfully",
        color: "success",
      });
    } catch (error: any) {
      logError("handleCreateWorkflow", error, { url, promptLength: prompt.length });
      const message = error.message || "Failed to create workflow";
      addToast({ title: "Error", description: message, color: "danger" });
      setErrorMessage(message);
    } finally {
      setRetryLoading(null);
    }
  };

  const handleForceRegenerateWorkflow = async () => {
    setRetryLoading('workflow');
    clearMessages();
    
    try {
      console.log("[handleForceRegenerateWorkflow] Force regenerating workflow for domain:", domain);
      
      const data = await makeApiCall(
        `${config.serverUrl}/api/workflow/create/`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ domain, prompt, force_regenerate: true }),
        },
        "force-regenerate-workflow"
      );

      setWorkflowResult({
        workflow_id: data.workflow_id,
        workflow_url: data.workflow_url,
        webhook_url: data.webhook_url
      });
      
      // Update cache
      invalidateProjectCache(domain);

      setSavedPrompt(prompt); // Prompt is now saved with the regenerated workflow
      addToast({
        title: "Success",
        description: data.message || "Workflow regenerated successfully",
        color: "success",
      });
    } catch (error: any) {
      logError("handleForceRegenerateWorkflow", error, { url, promptLength: prompt.length });
      const message = error.message || "Failed to regenerate workflow";
      addToast({ title: "Error", description: message, color: "danger" });
      setErrorMessage(message);
    } finally {
      setRetryLoading(null);
    }
  };

  const handleToggleMain = async (urlToToggle: string, currentMain: boolean = false) => {
    // Optimistic UI update
    setScrapedData((prevData) =>
      prevData.map((item) =>
        item.url === urlToToggle ? { ...item, main: !item.main } : item
      )
    );

    try {
      await makeApiCall(
        `${config.serverUrl}/api/scrape/toggle-main/`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ url: urlToToggle, domain, main: !currentMain }),
        },
        "toggle-main"
      );
      
      // Update cache
      invalidateProjectCache(domain);
    } catch (error: any) {
      // Revert UI on error
      setScrapedData((prevData) =>
        prevData.map((item) =>
          item.url === urlToToggle ? { ...item, main: currentMain } : item
        )
      );
      logError("handleToggleMain", error, { url: urlToToggle });
      addToast({
        title: "Error",
        description: "Failed to update main status",
        color: "danger",
      });
    }
  };

  const handleDeleteSelected = async () => {
    const urlsToDelete = scrapedData.filter(item => item.selected).map(item => item.url);
    if (urlsToDelete.length === 0) {
      const message = "No items selected for deletion.";
      addToast({ title: "Warning", description: message, color: "warning" });
      setErrorMessage(message);
      return;
    }

    try {
      console.log("[handleDeleteSelected] Deleting selected items:", urlsToDelete);
      
      // Optimistically remove from UI
      setScrapedData(prevData => prevData.filter(item => !item.selected));
      
      // Blacklist before deleting
      try {
          const blacklistRes = await makeApiCall(
              `${config.serverUrl}/api/scrape/blacklist/?domain=${domain}`,
              { headers: getAuthHeaders(), method: "GET" },
              "fetch-blacklist-bulk-delete"
          );
          const currentBlacklist = blacklistRes.blacklist || [];
          const newItems = urlsToDelete.filter(u => !currentBlacklist.includes(u));
          
          if (newItems.length > 0) {
              const newBlacklist = [...currentBlacklist, ...newItems];
              await makeApiCall(
                `${config.serverUrl}/api/scrape/blacklist/`,
                {
                    method: "POST",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ domain, blacklist: newBlacklist }),
                },
                "blacklist-bulk-items"
             );
          }
      } catch (e) {
          console.warn("Failed to blacklist items during bulk delete", e);
      }

      await makeApiCall(
        `${config.serverUrl}/api/scrape/items/delete/`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
          body: JSON.stringify({ urls: urlsToDelete, domain }),
        },
        "delete-selected-items"
      );
      
      // Update cache
      invalidateProjectCache(domain);
      
      addToast({
        title: "Success",
        description: `${urlsToDelete.length} item(s) deleted and blacklisted`,
        color: "success",
      });
    } catch (error: any) {
      logError("handleDeleteSelected", error, { urlsToDelete, domain });
      const message = "Failed to delete items from server, but they have been removed from the view. You may want to reload.";
      addToast({ title: "Error", description: message, color: "danger" });
      setErrorMessage(message);
    }
  };

  const handleToggleSelect = (urlToToggle: string) => {
    setScrapedData(prevData =>
      prevData.map(item =>
        item.url === urlToToggle ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const handleDeleteItem = async (urlToDelete: string) => {
    try {
      console.log("[handleDeleteItem] Deleting and blacklisting item:", urlToDelete);
      
      const confirmMessage = "Are you sure you want to delete this page? It will also be added to the blacklist to prevent future scraping.";
      if (!confirm(confirmMessage)) return;

      // Optimistically remove from UI first
      setScrapedData(prev => prev.filter(item => item.url !== urlToDelete));

      // 1. Blacklist the URL
      try {
          // Check/Fetch current blacklist to avoid overwrite (similar to New Project flow)
          // Or assume we can just append if backend supported it, but it doesn't yet.
          // Better approach: Use the bulk delete+blacklist logic if possible or replicate it.
          // Let's replicate smart logic:
          const blacklistRes = await makeApiCall(
              `${config.serverUrl}/api/scrape/blacklist/?domain=${domain}`,
              { headers: getAuthHeaders(), method: "GET" },
              "fetch-blacklist-single-delete"
          );
          const currentBlacklist = blacklistRes.blacklist || [];
          if (!currentBlacklist.includes(urlToDelete)) {
             const newBlacklist = [...currentBlacklist, urlToDelete];
             await makeApiCall(
                `${config.serverUrl}/api/scrape/blacklist/`,
                {
                    method: "POST",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ domain, blacklist: newBlacklist }),
                },
                "blacklist-single-item"
             );
          }
      } catch (e) {
          console.warn("Failed to blacklist item during delete", e);
      }

      // 2. Delete the item
      await makeApiCall(
        `${config.serverUrl}/api/scrape/item/delete/`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
          body: JSON.stringify({ url: urlToDelete, domain }),
        },
        "delete-item"
      );
      
      // Update cache
      invalidateProjectCache(domain);
      
      addToast({
        title: "Success",
        description: "Page deleted and blacklisted",
        color: "success",
      });
    } catch (error: any) {
      logError("handleDeleteItem", error, { urlToDelete, domain });
      const message = "Failed to delete item from server, but it has been removed from the view. You may want to reload.";
      addToast({ title: "Error", description: message, color: "warning" });
      setErrorMessage(message);
    }
  };

  const handleRescrapeItem = async (pageUrl: string, domain: string) => {
    try {
      console.log("[handleRescrapeItem] Re-scraping item:", pageUrl);
      
      const data = await makeApiCall(
        `${config.serverUrl}/api/scrape/single-page/`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ page_url: pageUrl, domain }),
        },
        "rescrape-item"
      );
      
      // Update the item in the UI with the new data
      if (data.updated_data) {
        setScrapedData(prevData => 
          prevData.map(item => 
            item.url === pageUrl 
              ? { ...item, ...data.updated_data, selected: item.selected }
              : item
          )
        );
      }
      
      // Update cache
      invalidateProjectCache(domain);

      addToast({
        title: "Success",
        description: "Page re-scraped successfully",
        color: "success",
      });
    } catch (error: any) {
      logError("handleRescrapeItem", error, { pageUrl, domain });
      const message = error.message || "Failed to re-scrape page";
      addToast({ title: "Error", description: message, color: "danger" });
      throw error; // Re-throw to let the button handle loading state
    }
  };

  const handleUpdateImage = async (url: string, newImageUrl: string) => {
    try {
      await makeApiCall(
        `${config.serverUrl}/api/scrape/update-image/`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            domain,
            url,
            image_url: newImageUrl,
          }),
        },
        'updateImage'
      );

      // Update local state
      setScrapedData(prev => prev.map(item => 
        item.url === url ? { ...item, image: newImageUrl } : item
      ));
      
      // Update cache
      invalidateProjectCache(domain);

    } catch (error: any) {
      logError('handleUpdateImage', error);
      throw error; // Re-throw to be handled by the component
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
    <>
      <AuthModal 
        isOpen={!isAuthenticated} 
        onAuthenticate={login}
      />
      
      <div className="flex flex-col gap-6 w-full py-6">
        {isAuthenticated && (loading ? (
            <div className="flex justify-center items-center py-12">
               <div>Loading project data...</div>
            </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               <Card
                className="hover:scale-[1.02] transition-transform cursor-pointer border-secondary/20 bg-secondary/10"
                isPressable
                onPress={() => {
                   let demoUrl = `/demo?domain=${domain}`;
                   if (workflowResult?.webhook_url) {
                       demoUrl += `&webhook=${encodeURIComponent(workflowResult.webhook_url)}`;
                   }
                   router.push(demoUrl);
                }}
               >
                  <CardBody className="gap-2 p-6">
                       <h3 className="font-bold text-lg">View Live Demo</h3>
                       <p className="text-sm text-default-500">Test the assistant in a live environment.</p>
                  </CardBody>
               </Card>
               <Card className="hover:scale-[1.02] transition-transform cursor-pointer border-primary/20 bg-primary/10" isPressable onPress={() => router.push(`/project/${domain}/scraping`)}>
                  <CardBody className="gap-2 p-6">
                       <h3 className="font-bold text-lg">Scraping Settings</h3>
                       <p className="text-sm text-default-500">Manage URLs, re-scrape, and configure settings.</p>
                  </CardBody>
               </Card>
            </div>
            
            {scrapingProgress && (
              <div className="w-full mt-4 p-4 border rounded-lg bg-content1 cursor-pointer hover:bg-content2 transition-colors" onClick={() => router.push(`/project/${domain}/scraping`)}>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Scraping in Progress...</span>
                  <span className="text-sm text-default-500">
                    {scrapingProgress.current} / {scrapingProgress.total}
                  </span>
                </div>
                <div className="w-full bg-default-200 rounded-full h-2.5 mb-2">
                  <div 
                    className="bg-primary h-2.5 rounded-full transition-all duration-500" 
                    style={{ width: `${(scrapingProgress.current / Math.max(scrapingProgress.total, 1)) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-default-400 truncate">
                  Click to view details
                </p>
              </div>
            )}
            
            <div className="mt-4">
              <h2 className="text-xl font-bold mb-4">Project Data</h2>
              <ResultsDisplay
                lastSmartUpdate={lastSmartUpdate}
                sheetId={sheetId}
                prompt={prompt}
                workflowResult={workflowResult}
                webhookSecret={webhookSecret}
                scrapedData={scrapedData}
                url={url}
              loading={loading}
              retryLoading={retryLoading}
              handleRegeneratePrompt={handleRegeneratePrompt}
              handleCreateWorkflow={handleCreateWorkflow}
              handleForceRegenerateWorkflow={handleForceRegenerateWorkflow}
              handleSavePromptToWorkflow={handleSavePromptToWorkflow}
              handleDeleteItem={handleDeleteItem}
              handleToggleMain={handleToggleMain}
              handleRescrapeItem={handleRescrapeItem}
              handleUpdateImage={handleUpdateImage}
              handleToggleSelect={handleToggleSelect}
              setPrompt={setPrompt}
              promptModified={prompt !== savedPrompt}
              showAddMorePages={showAddMorePages}
              onShowAddMorePages={handleShowAddMorePages}
              additionalUrls={additionalUrls}
              onToggleAdditionalUrl={(urlToToggle) => {
                setAdditionalUrls(prev =>
                  prev.map(item =>
                    item.url === urlToToggle ? { ...item, selected: !item.selected } : item
                  )
                );
              }}
              onAddAdditionalUrl={(newUrl) => {
                if (newUrl && !additionalUrls.some(item => item.url === newUrl)) {
                  setAdditionalUrls(prev => [...prev, { url: newUrl, selected: true }]);
                }
              }}
              onScrapeAdditionalPages={handleScrapeAdditionalPages}
              onCancelAddMorePages={() => {
                setShowAddMorePages(false);
                setAdditionalUrls([]);
              }}
              handleDeleteSelected={handleDeleteSelected}
              numSelected={scrapedData.filter(item => item.selected).length}
            />
            </div>
          </>
        ))}
      </div>
    </>
  );
}
