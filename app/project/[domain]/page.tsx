"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import { config } from "@/lib/config";
import ActionButtons from "@/app/components/ActionButtons";
import StatusDisplays from "@/app/components/StatusDisplays";
import ResultsDisplay from "@/app/components/ResultsDisplay";
import AuthModal from "@/app/components/AuthModal";
import ChatWidget from "@/app/components/ChatWidget";
import { useRouter, useParams } from "next/navigation";

interface ScrapedDataItem {
  url: string;
  title: string;
  content: string;
  textLength: number;
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

export default function ProjectPage() {
  const params = useParams();
  const domain = params.domain as string;
  const { isAuthenticated, authKey, isLoading: authIsLoading, login } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [retryLoading, setRetryLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [warnings, setWarnings] = useState("");
  const [scrapedData, setScrapedData] = useState<SelectedScrapedDataItem[]>([]);
  const [prompt, setPrompt] = useState("");
  const [workflowResult, setWorkflowResult] = useState<WorkflowResult | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [showAddMorePages, setShowAddMorePages] = useState(false);
  const [additionalUrls, setAdditionalUrls] = useState<{ url: string; selected: boolean }[]>([]);

  const url = `http://${domain}`;

  const clearMessages = () => {
    setMessage("");
    setErrorMessage("");
    setWarnings("");
  };

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    "X-Auth-Key": authKey,
  });

  useEffect(() => {
    const loadProjectData = async () => {
      if (!authKey || !domain) return;

      setLoading(true);
      clearMessages();

      try {
        console.log("[ProjectPage] Loading project data for:", domain);
        
        const checkData = await makeApiCall(
          `${config.serverUrl}/api/scrape/check-existing/`,
          {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ url: `http://${domain}` }),
          },
          "project-load"
        );

        if (checkData.has_existing_data) {
          setScrapedData((checkData.existing_data || []).map((item: ScrapedDataItem) => ({ ...item, selected: false })));
          if (checkData.existing_prompt) {
            setPrompt(checkData.existing_prompt);
          }
          if (checkData.existing_workflow) {
            setWorkflowResult(checkData.existing_workflow);
          }
          setMessage(`Loaded ${checkData.count} existing pages for ${domain}.`);
        } else {
          setErrorMessage("No data found for this project. Redirecting to home page.");
          setTimeout(() => router.push('/'), 3000);
        }
      } catch (error: any) {
        logError("loadProjectData", error, { domain });
        setErrorMessage(error.message || "Failed to load project data");
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      loadProjectData();
    }
  }, [isAuthenticated, domain, authKey, router]);

  const handleScrapeAdditionalPages = async () => {
    const selectedAdditionalUrls = additionalUrls.filter(item => item.selected).map(item => item.url);
    
    if (selectedAdditionalUrls.length === 0) {
      setErrorMessage("Please select at least one additional URL to scrape.");
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
      setMessage(data.message || "Additional pages scraped successfully");
      if (data.warnings) {
        setWarnings(data.warnings);
      }
      setShowAddMorePages(false);
      setAdditionalUrls([]);
    } catch (error: any) {
      logError("handleScrapeAdditionalPages", error, { url, selectedUrls: selectedAdditionalUrls });
      setErrorMessage(error.message || "Failed to scrape additional pages");
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
        setMessage("No new pages found in the sitemap that haven't been scraped yet.");
        setShowAddMorePages(true); // Still show the UI to allow manual entry
        setAdditionalUrls([]);
        return;
      }
      
      setAdditionalUrls(newUrls.map((u: string) => ({ url: u, selected: true })));
      setShowAddMorePages(true);
    } catch (error: any) {
      logError("handleShowAddMorePages", error, { url });
      setErrorMessage(error.message || "Failed to fetch additional pages");
    } finally {
      setLoading(false);
    }
  };

  const handleRetryScraping = async (forceRescrape = false) => {
    setRetryLoading('scraping');
    clearMessages();

    try {
      console.log("[handleRetryScraping] Retrying scraping, force:", forceRescrape);
      const data = await makeApiCall(
        `${config.serverUrl}/api/scrape/retry/`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ url, force_rescrape: forceRescrape }),
        },
        "retry-scraping"
      );

      setMessage(data.message || "Scraping retry completed");
      if (data.warnings) {
        setWarnings(data.warnings);
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
    } catch (error: any) {
      logError("handleRetryScraping", error, { url, forceRescrape });
      setErrorMessage(error.message || "Failed to retry scraping");
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
      setMessage(data.message || "Prompt regenerated successfully");
    } catch (error: any) {
      logError("handleRegeneratePrompt", error, { url });
      setErrorMessage(error.message || "Failed to regenerate prompt");
    } finally {
      setRetryLoading(null);
    }
  };

  const handleCreateWorkflow = async () => {
    if (!prompt.trim()) {
      setErrorMessage("Please generate a prompt first before creating a workflow");
      return;
    }

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
      setMessage(data.message || "Workflow created successfully");
    } catch (error: any) {
      logError("handleCreateWorkflow", error, { url, promptLength: prompt.length });
      setErrorMessage(error.message || "Failed to create workflow");
    } finally {
      setRetryLoading(null);
    }
  };

  const handleDeleteSelected = async () => {
    const urlsToDelete = scrapedData.filter(item => item.selected).map(item => item.url);
    if (urlsToDelete.length === 0) {
      setErrorMessage("No items selected for deletion.");
      return;
    }

    try {
      console.log("[handleDeleteSelected] Deleting selected items:", urlsToDelete);
      
      // Optimistically remove from UI
      setScrapedData(prevData => prevData.filter(item => !item.selected));
      
      await makeApiCall(
        `${config.serverUrl}/api/scrape/items/delete/`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
          body: JSON.stringify({ urls: urlsToDelete, domain }),
        },
        "delete-selected-items"
      );
      
      setMessage(`${urlsToDelete.length} item(s) deleted successfully`);
    } catch (error: any) {
      logError("handleDeleteSelected", error, { urlsToDelete, domain });
      setErrorMessage("Failed to delete items from server, but they have been removed from the view. You may want to reload.");
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
      console.log("[handleDeleteItem] Deleting item:", urlToDelete);
      
      // Optimistically remove from UI first
      setScrapedData(prevData => prevData.filter(item => item.url !== urlToDelete));
      
      await makeApiCall(
        `${config.serverUrl}/api/scrape/item/delete/`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
          body: JSON.stringify({ url: urlToDelete, domain }),
        },
        "delete-item"
      );
      
      setMessage("Item deleted successfully");
    } catch (error: any) {
      logError("handleDeleteItem", error, { urlToDelete, domain });
      setErrorMessage("Failed to delete item from server, but it has been removed from the view");
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
      
      {/* Floating Chat Widget */}
      {workflowResult?.webhook_url && (
        <ChatWidget
          webhookUrl={workflowResult.webhook_url}
          label={`${domain} Assistant`}
          description="Get instant help with your questions"
        />
      )}
      
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <div className="inline-block text-center justify-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Project: {domain}</h1>
          <h2 className="text-lg md:text-xl text-muted-foreground">Viewing scraped data and managing workflow.</h2>
        </div>

        {isAuthenticated && (loading ? (
            <div>Loading project data...</div>
        ) : (
          <>
            <ActionButtons
              scrapedDataLength={scrapedData.length}
              errorMessage={errorMessage}
              url={url}
              handleRetryScraping={handleRetryScraping}
              loading={loading}
              retryLoading={retryLoading}
            />

            <StatusDisplays
              message={message}
              errorMessage={errorMessage}
              warnings={warnings}
            />

            <ResultsDisplay
              sheetId={sheetId}
              prompt={prompt}
              workflowResult={workflowResult}
              scrapedData={scrapedData}
              url={url}
              loading={loading}
              retryLoading={retryLoading}
              handleRegeneratePrompt={handleRegeneratePrompt}
              handleCreateWorkflow={handleCreateWorkflow}
              handleDeleteItem={handleDeleteItem}
              handleToggleSelect={handleToggleSelect}
              setPrompt={setPrompt}
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
          </>
        ))}
      </section>
    </>
  );
}
