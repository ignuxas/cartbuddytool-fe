"use client";

import { useEffect, useState } from "react";
import { config } from "@/lib/config";
import ResultsDisplay from "@/app/components/ResultsDisplay";
import ActionButtons from "@/app/components/ActionButtons";
import AuthModal from "@/app/components/AuthModal";
import ChatWidget from "@/app/components/ChatWidget";
import WidgetCustomization from "@/app/components/WidgetCustomization";
import { useRouter, useParams } from "next/navigation";
import { addToast } from "@heroui/toast";
import { useAuthContext } from "@/app/contexts/AuthContext";

interface ScrapedDataItem {
  url: string;
  title: string;
  content: string;
  textLength: number;
  main?: boolean;
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
  const { isAuthenticated, authKey, isLoading: authIsLoading, login } = useAuthContext();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [retryLoading, setRetryLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [scrapedData, setScrapedData] = useState<SelectedScrapedDataItem[]>([]);
  const [prompt, setPrompt] = useState("");
  const [workflowResult, setWorkflowResult] = useState<WorkflowResult | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [showAddMorePages, setShowAddMorePages] = useState(false);
  const [additionalUrls, setAdditionalUrls] = useState<{ url: string; selected: boolean }[]>([]);
  const [widgetSettingsKey, setWidgetSettingsKey] = useState(0); // Key to force re-render of widget

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
          // Toast removed - silently load project data
        } else {
          const message = "No data found for this project. Redirecting to home page.";
          addToast({ title: "Error", description: message, color: "danger" });
          setErrorMessage(message);
          setTimeout(() => router.push('/'), 3000);
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
  }, [isAuthenticated, domain, authKey, router]);

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
    } catch (error: any) {
      logError("handleRetryScraping", error, { url, forceRescrape });
      const message = error.message || "Failed to retry scraping";
      addToast({ title: "Error", description: message, color: "danger" });
      setErrorMessage(message);
    } finally {
      setRetryLoading(null);
    }
  };

  const handleSmartRescrapeImages = async () => {
    setRetryLoading('smart-images');
    clearMessages();

    try {
      console.log("[handleSmartRescrapeImages] Starting smart re-scrape");
      const data = await makeApiCall(
        `${config.serverUrl}/api/scrape/smart-images/`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ url }),
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
      const checkData = await makeApiCall(
        `${config.serverUrl}/api/scrape/check-existing/`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ url }),
        },
        "reload-project-data"
      );

      if (checkData.has_existing_data && checkData.existing_data) {
        setScrapedData(checkData.existing_data.map((item: ScrapedDataItem) => ({ ...item, selected: false })));
      }
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

  const handleCreateWorkflow = async () => {
    if (!prompt.trim()) {
      const message = "Please generate a prompt first before creating a workflow";
      addToast({ title: "Error", description: message, color: "danger" });
      setErrorMessage(message);
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
    if (!prompt.trim()) {
      const message = "Please generate a prompt first before creating a workflow";
      addToast({ title: "Error", description: message, color: "danger" });
      setErrorMessage(message);
      return;
    }

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
      
      await makeApiCall(
        `${config.serverUrl}/api/scrape/items/delete/`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
          body: JSON.stringify({ urls: urlsToDelete, domain }),
        },
        "delete-selected-items"
      );
      
      addToast({
        title: "Success",
        description: `${urlsToDelete.length} item(s) deleted successfully`,
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
      
      addToast({
        title: "Success",
        description: "Item deleted successfully",
        color: "success",
      });
    } catch (error: any) {
      logError("handleDeleteItem", error, { urlToDelete, domain });
      const message = "Failed to delete item from server, but it has been removed from the view";
      addToast({ title: "Error", description: message, color: "danger" });
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
          key={widgetSettingsKey}
          webhookUrl={workflowResult.webhook_url}
          label={`${domain} Assistant`}
          description="Get instant help with your questions"
          siteName={domain}
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
              handleSmartRescrapeImages={handleSmartRescrapeImages}
              loading={loading}
              retryLoading={retryLoading}
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
              handleForceRegenerateWorkflow={handleForceRegenerateWorkflow}
              handleDeleteItem={handleDeleteItem}
              handleRescrapeItem={handleRescrapeItem}
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

            {/* Widget Customization Section */}
            {workflowResult?.webhook_url && (
              <div className="w-full max-w-7xl mt-8">
                <WidgetCustomization
                  domain={domain}
                  authKey={authKey!}
                  onSettingsUpdated={() => {
                    setWidgetSettingsKey(prev => prev + 1);
                    addToast({
                      title: 'Success',
                      description: 'Widget settings updated. The chat widget will reflect the new settings.',
                      color: 'success',
                    });
                  }}
                />
              </div>
            )}
          </>
        ))}
      </section>
    </>
  );
}
