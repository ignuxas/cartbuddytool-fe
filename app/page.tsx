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
  sheet_id: string;
}

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
      // First check if domain already has data
      const checkResponse = await fetch(`${config.serverUrl}/api/scrape/check-existing/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ url }),
      });

      const checkData = await checkResponse.json();

      if (!checkResponse.ok) {
        throw new Error(checkData.error || "Something went wrong");
      }

      if (checkData.has_existing_data) {
        setExistingDataInfo({
          count: checkData.count,
          existing_data: checkData.existing_data,
          existing_prompt: checkData.existing_prompt
        });
        setStep("existing");
      } else {
        // No existing data, proceed with normal flow
        const response = await fetch(`${config.serverUrl}/api/scrape/get-urls/`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ url }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Something went wrong");
        }

        setSitemapUrls(data.urls.map((u: string) => ({ url: u, selected: true })));
        setStep("selection");
      }
    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUseExistingData = () => {
    if (existingDataInfo) {
      setScrapedData(existingDataInfo.existing_data);
      if (existingDataInfo.existing_prompt) {
        setPrompt(existingDataInfo.existing_prompt);
      }
      setMessage(`Loaded ${existingDataInfo.count} existing pages.`);
      setStep("results");
    }
  };

  const handleRescanWebsite = async () => {
    setLoading(true);
    clearMessages();
    setExistingDataInfo(null);

    try {
      const response = await fetch(`${config.serverUrl}/api/scrape/get-urls/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setSitemapUrls(data.urls.map((u: string) => ({ url: u, selected: true })));
      setStep("selection");
    } catch (error: any) {
      setErrorMessage(error.message);
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
      const response = await fetch(`${config.serverUrl}/api/scrape/additional/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          url, 
          additional_urls: selectedAdditionalUrls 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to scrape additional pages");
      }

      setScrapedData(data.all_data);
      setPrompt(data.prompt);
      setMessage(data.message);
      if (data.warnings) {
        setWarnings(data.warnings);
      }
      setShowAddMorePages(false);
      setAdditionalUrls([]);
    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setRetryLoading(null);
    }
  };

  const handleStartScraping = async () => {
    setLoading(true);
    clearMessages();
    setScrapedData([]);
    setPrompt("");
    setWorkflowResult(null);
    setSheetId(null);
    setStep("results");

    const selectedUrls = sitemapUrls.filter(item => item.selected).map(item => item.url);

    if (selectedUrls.length === 0) {
      setErrorMessage("Please select at least one URL to scrape.");
      setLoading(false);
      setStep("selection");
      return;
    }

    try {
      const response = await fetch(`${config.serverUrl}/api/scrape/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ url, urls_to_scrape: selectedUrls }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setMessage(data.message);
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
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShowAddMorePages = async () => {
    setLoading(true);
    clearMessages();

    try {
      const response = await fetch(`${config.serverUrl}/api/scrape/get-urls/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      // Filter out URLs that are already scraped
      const existingUrls = new Set(scrapedData.map(item => item.url));
      const newUrls = data.urls.filter((u: string) => !existingUrls.has(u));
      
      setAdditionalUrls(newUrls.map((u: string) => ({ url: u, selected: false })));
      setShowAddMorePages(true);
    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRetryScraping = async (forceRescrape = false) => {
    setRetryLoading('scraping');
    clearMessages();

    try {
      const response = await fetch(`${config.serverUrl}/api/scrape/retry/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ url, force_rescrape: forceRescrape }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to retry scraping");
      }

      setMessage(data.message);
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
      setErrorMessage(error.message);
    } finally {
      setRetryLoading(null);
    }
  };

  const handleRegeneratePrompt = async () => {
    setRetryLoading('prompt');
    clearMessages();
    try {
      const domain = new URL(url).hostname;
      const response = await fetch(`${config.serverUrl}/api/scrape/regenerate/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ domain }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to regenerate prompt");
      }

      setPrompt(data.prompt);
      setMessage(data.message);
    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setRetryLoading(null);
    }
  };

  const handleCreateWorkflow = async () => {
    setRetryLoading('workflow');
    clearMessages();
    try {
      const domain = new URL(url).hostname;
      const response = await fetch(`${config.serverUrl}/api/workflow/create/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ domain, prompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create workflow");
      }

      setWorkflowResult({
        workflow_id: data.workflow_id,
        workflow_url: data.workflow_url,
        sheet_id: data.sheet_id
      });
      setMessage(data.message);
    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setRetryLoading(null);
    }
  };

  const handleDeleteItem = async (urlToDelete: string, domain: string) => {
    setScrapedData(prevData => prevData.filter(item => item.url !== urlToDelete));
    try {
      await fetch(`${config.serverUrl}/api/scrape/item/delete/`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        body: JSON.stringify({ url: urlToDelete, domain }),
      });
    } catch (error: any) {
      setErrorMessage("Failed to delete item on the server. It has been removed from the view.");
    }
  };

  const handleToggleUrlSelection = (urlToToggle: string) => {
    setSitemapUrls(prev =>
      prev.map(item =>
        item.url === urlToToggle ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const handleAddUrl = () => {
    if (newUrl && !sitemapUrls.some(item => item.url === newUrl)) {
      setSitemapUrls(prev => [...prev, { url: newUrl, selected: true }]);
      setNewUrl("");
    }
  };

  const handleSelectAll = (select: boolean) => {
    setSitemapUrls(prev => prev.map(item => ({ ...item, selected: select })));
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
      const checkResponse = await fetch(`${config.serverUrl}/api/scrape/check-existing/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ url: selectedUrl }),
      });

      const checkData = await checkResponse.json();

      if (!checkResponse.ok) {
        throw new Error(checkData.error || "Something went wrong");
      }

      if (checkData.has_existing_data) {
        // Directly load the data instead of showing the existing data card
        setScrapedData(checkData.existing_data);
        if (checkData.existing_prompt) {
          setPrompt(checkData.existing_prompt);
        }
        setMessage(`Loaded ${checkData.count} existing pages for ${new URL(selectedUrl).hostname}.`);
        setStep("results");
      } else {
        setErrorMessage("No data found for this project.");
        setStep("form");
      }
    } catch (error: any) {
      setErrorMessage(error.message);
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
              {sitemapUrls.map(item => (
                <Checkbox
                  key={item.url}
                  isSelected={item.selected}
                  onValueChange={() => handleToggleUrlSelection(item.url)}
                  size="sm"
                >
                  <span className="text-sm truncate">{item.url}</span>
                </Checkbox>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="Add another URL"
                onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
              />
              <Button onClick={handleAddUrl}>Add</Button>
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