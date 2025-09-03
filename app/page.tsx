"use client";

import { useState } from "react";
import { title, subtitle } from "@/components/primitives";
import UrlForm from "./components/UrlForm";
import ActionButtons from "./components/ActionButtons";
import StatusDisplays from "./components/StatusDisplays";
import ResultsDisplay from "./components/ResultsDisplay";
import AuthModal from "./components/AuthModal";
import { useAuth } from "./hooks/useAuth";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Checkbox } from "@heroui/checkbox";
import { Card, CardBody } from "@heroui/card";
import ExistingProjects from "./components/ExistingProjects";
import { config } from "@/lib/config";

interface ScrapedDataItem {
  url: string;
  title: string;
  content: string;
  textLength: number;
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

export default function Home() {
  const { isAuthenticated, authKey, isLoading, login, logout } = useAuth();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [retryLoading, setRetryLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [warnings, setWarnings] = useState("");
  const [scrapedData, setScrapedData] = useState<ScrapedDataItem[]>([]);
  const [prompt, setPrompt] = useState("");
  const [workflowResult, setWorkflowResult] = useState<WorkflowResult | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "existing" | "selection" | "results">("form");
  const [sitemapUrls, setSitemapUrls] = useState<{ url: string; selected: boolean }[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [existingDataInfo, setExistingDataInfo] = useState<{
    count: number;
    existing_data: ScrapedDataItem[];
    existing_prompt?: string;
    existing_workflow?: WorkflowResult;
  } | null>(null);
  const [showAddMorePages, setShowAddMorePages] = useState(false);
  const [additionalUrls, setAdditionalUrls] = useState<{ url: string; selected: boolean }[]>([]);

  const clearMessages = () => {
    setMessage("");
    setErrorMessage("");
    setWarnings("");
  };

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    "X-Auth-Key": authKey,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setErrorMessage("Please enter a valid URL");
      return;
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      setErrorMessage("Please enter a valid URL (including http:// or https://)");
      return;
    }

    setLoading(true);
    clearMessages();
    setScrapedData([]);
    setPrompt("");
    setWorkflowResult(null);
    setSheetId(null);
    setSitemapUrls([]);
    setExistingDataInfo(null);
    setShowAddMorePages(false);

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
        setStep("selection");
      }
    } catch (error: any) {
      logError("handleSubmit", error, { url });
      setErrorMessage(error.message || "An unexpected error occurred while processing your request");
    } finally {
      setLoading(false);
    }
  };

  const handleUseExistingData = () => {
    try {
      if (!existingDataInfo) {
        throw new Error("No existing data available");
      }

      console.log("[handleUseExistingData] Loading existing data");
      setScrapedData(existingDataInfo.existing_data);
      if (existingDataInfo.existing_prompt) {
        setPrompt(existingDataInfo.existing_prompt);
      }
      if (existingDataInfo.existing_workflow) {
        setWorkflowResult(existingDataInfo.existing_workflow);
      }
      setMessage(`Loaded ${existingDataInfo.count} existing pages.`);
      setStep("results");
    } catch (error: any) {
      logError("handleUseExistingData", error);
      setErrorMessage("Failed to load existing data");
    }
  };

  const handleRescanWebsite = async () => {
    setLoading(true);
    clearMessages();
    setExistingDataInfo(null);

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
      setStep("selection");
    } catch (error: any) {
      logError("handleRescanWebsite", error, { url });
      setErrorMessage(error.message || "Failed to rescan website");
    } finally {
      setLoading(false);
    }
  };

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

      setScrapedData(data.all_data || []);
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

  const handleStartScraping = async () => {
    const selectedUrls = sitemapUrls.filter(item => item.selected).map(item => item.url);

    if (selectedUrls.length === 0) {
      setErrorMessage("Please select at least one URL to scrape.");
      return;
    }

    setLoading(true);
    clearMessages();
    setScrapedData([]);
    setPrompt("");
    setWorkflowResult(null);
    setSheetId(null);
    setStep("results");

    try {
      console.log("[handleStartScraping] Starting scraping process for", selectedUrls.length, "URLs");
      const data = await makeApiCall(
        `${config.serverUrl}/api/scrape/`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ url, urls_to_scrape: selectedUrls }),
        },
        "start-scraping"
      );

      setMessage(data.message || "Scraping completed successfully");
      if (data.warnings) {
        setWarnings(data.warnings);
      }
      if (data.scraped_data) {
        setScrapedData(data.scraped_data);
      }
      if (data.prompt) {
        setPrompt(data.prompt);
      }
      if (data.sheet_id) {
        setSheetId(data.sheet_id);
      }
    } catch (error: any) {
      logError("handleStartScraping", error, { url, selectedUrls });
      setErrorMessage(error.message || "Failed to scrape the selected pages");
    } finally {
      setLoading(false);
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
        setMessage("No additional pages found that haven't been scraped yet.");
        return;
      }
      
      setAdditionalUrls(newUrls.map((u: string) => ({ url: u, selected: false })));
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
        setScrapedData(data.scraped_data);
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
      const domain = new URL(url).hostname;
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
      const domain = new URL(url).hostname;
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

  const handleDeleteItem = async (urlToDelete: string, domain: string) => {
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
        setErrorMessage("Please enter a valid URL (including http:// or https://)");
        return;
      }

      // Check for duplicates
      if (sitemapUrls.some(item => item.url === newUrl)) {
        setErrorMessage("This URL is already in the list");
        return;
      }

      setSitemapUrls(prev => [...prev, { url: newUrl, selected: true }]);
      setNewUrl("");
    } catch (error: any) {
      logError("handleAddUrl", error, { newUrl });
      setErrorMessage("Failed to add URL");
    }
  };

  const handleSelectAll = (select: boolean) => {
    try {
      setSitemapUrls(prev => prev.map(item => ({ ...item, selected: select })));
    } catch (error: any) {
      logError("handleSelectAll", error, { select });
    }
  };

  const handleProjectSelect = async (selectedUrl: string) => {
    setUrl(selectedUrl);
    
    // Directly load existing data when a project is selected
    setLoading(true);
    clearMessages();
    setScrapedData([]);
    setPrompt("");
    setWorkflowResult(null);
    setSheetId(null);
    setSitemapUrls([]);
    setExistingDataInfo(null);
    setShowAddMorePages(false);

    try {
      console.log("[handleProjectSelect] Loading project data for:", selectedUrl);
      
      const checkData = await makeApiCall(
        `${config.serverUrl}/api/scrape/check-existing/`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ url: selectedUrl }),
        },
        "project-select"
      );

      if (checkData.has_existing_data) {
        // Directly load the data instead of showing the existing data card
        setScrapedData(checkData.existing_data || []);
        if (checkData.existing_prompt) {
          setPrompt(checkData.existing_prompt);
        }
        if (checkData.existing_workflow) {
          setWorkflowResult(checkData.existing_workflow);
        }
        setMessage(`Loaded ${checkData.count} existing pages for ${new URL(selectedUrl).hostname}.`);
        setStep("results");
      } else {
        setErrorMessage("No data found for this project.");
        setStep("form");
      }
    } catch (error: any) {
      logError("handleProjectSelect", error, { selectedUrl });
      setErrorMessage(error.message || "Failed to load project data");
      setStep("form");
    } finally {
      setLoading(false);
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
          <h1 className={title()}>Website Assistant Generator</h1>
          <h2 className={subtitle({ class: "mt-4" })}>
            Enter your website URL to get started.
          </h2>
          {isAuthenticated && (
            <Button 
              size="sm" 
              variant="light" 
              onPress={logout}
              className="mt-2"
            >
              Logout
            </Button>
          )}
        </div>

        {isAuthenticated && (
          <div className="w-full flex flex-col items-center gap-4">
            <UrlForm
              url={url}
              setUrl={setUrl}
              handleSubmit={handleSubmit}
              loading={loading}
              retryLoading={retryLoading}
            />

            {step === 'form' && (
              <ExistingProjects 
                authKey={authKey}
                onProjectSelect={handleProjectSelect}
              />
            )}
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
            <h3 className="text-xl font-bold">Select pages to scrape</h3>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleSelectAll(true)}>Select All</Button>
              <Button size="sm" onClick={() => handleSelectAll(false)}>Deselect All</Button>
            </div>
            <div className="max-h-64 overflow-y-auto border rounded-md p-2 flex flex-col gap-2">
              {sitemapUrls.map((item, index) => (
                <Checkbox
                  key={`${item.url}-${index}`} // Use index as fallback for unique keys
                  isSelected={item.selected}
                  onValueChange={() => handleToggleUrlSelection(item.url)}
                  size="sm"
                >
                  <span className="text-sm truncate" title={item.url}>{item.url}</span>
                </Checkbox>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="Add another URL (include http:// or https://)"
                onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
                isInvalid={newUrl.trim() !== "" && (() => {
                  try {
                    new URL(newUrl);
                    return false;
                  } catch {
                    return true;
                  }
                })()}
                errorMessage={newUrl.trim() !== "" && (() => {
                  try {
                    new URL(newUrl);
                    if (sitemapUrls.some(item => item.url === newUrl)) {
                      return "This URL is already in the list";
                    }
                    return "";
                  } catch {
                    return "Please enter a valid URL";
                  }
                })()}
              />
              <Button 
                onClick={handleAddUrl}
                disabled={newUrl.trim() === "" || (() => {
                  try {
                    new URL(newUrl);
                    return sitemapUrls.some(item => item.url === newUrl);
                  } catch {
                    return true;
                  }
                })()}
              >
                Add
              </Button>
            </div>
            <Button
              color="primary"
              onClick={handleStartScraping}
              isLoading={loading}
              disabled={loading}
            >
              Scrape {sitemapUrls.filter(u => u.selected).length} Selected Pages
            </Button>
          </div>
        )}

        {step === 'results' && (
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
            />
          </>
        )}
      </section>
    </>
  );
}