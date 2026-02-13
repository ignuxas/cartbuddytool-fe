"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { config } from "@/lib/config";
import ActionButtons from "@/app/components/ActionButtons";
import ScrapedPagesTable from "@/app/components/ScrapedPagesTable";
import { useRouter, useParams } from "next/navigation";
import { addToast } from "@heroui/toast";
import { useAuth } from "@/app/contexts/AuthContext";
import { Button } from "@heroui/button";
import { Link } from "@heroui/link";
import { Card, CardBody } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import BlacklistManager from "@/app/components/BlacklistManager";
import PlaywrightSwitch from "@/app/components/PlaywrightSwitch";
import { Switch } from "@heroui/switch";
import { Checkbox } from "@heroui/checkbox";
import { Input } from "@heroui/input";
import { useScrapingPageData } from "@/app/utils/swr";
import { makeApiCall, logError } from "@/app/utils/apiHelper";

// Configuration for Main Pages
const MAX_MAIN_PAGES = 5;

interface ScrapedDataItem {
  url: string;
  title: string;
  content: string;
  textLength: number;
  main?: boolean;
  image?: string;
  selected: boolean;
}

export default function ScrapingPage() {
  const params = useParams();
  const domain = params.domain as string;
  const { isAuthenticated, accessToken: authKey, isLoading: authIsLoading, isSuperAdmin } = useAuth();
  const router = useRouter();
  const [retryLoading, setRetryLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [useAI, setUseAI] = useState(false);
  const [retryCount, setRetryCount] = useState(3);
  const [retryDelay, setRetryDelay] = useState(1.0);
  const [concurrency, setConcurrency] = useState(5);
  const [scrapedData, setScrapedData] = useState<ScrapedDataItem[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [blacklist, setBlacklist] = useState<string[]>([]);
  const [keepImages, setKeepImages] = useState(true);
  const [usePlaywright, setUsePlaywright] = useState(false);
  const [showAddMorePages, setShowAddMorePages] = useState(false);
  const [additionalUrls, setAdditionalUrls] = useState<{ url: string; selected: boolean }[]>([]);
  const [newAdditionalUrl, setNewAdditionalUrl] = useState("");
  const [usePlaywrightForAdditional, setUsePlaywrightForAdditional] = useState(false);
  
  // Modals state
  const blacklistModal = useDisclosure();
  const rescrapeModal = useDisclosure();
  const [itemsToBlacklist, setItemsToBlacklist] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const [scrapingProgress, setScrapingProgress] = useState<{ 
    current: number; 
    total: number; 
    status: string; 
    currentUrl?: string;
    pageStatuses?: { url: string; status: string; error?: string; status_code?: number }[];
  } | null>(null);

  // Polling cleanup ref
  const pollingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const url = `http://${domain}`;

  const clearMessages = () => {
    setErrorMessage("");
  };

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${authKey!}`,
  });

  // --- SWR: single request for scraped data + blacklist + active job ---
  const { data: pageData, isLoading: loading, revalidate } = useScrapingPageData(
    isAuthenticated ? domain : null,
    authKey
  );

  // Sync SWR data into local state when it arrives/updates
  useEffect(() => {
    if (!pageData) return;

    if (pageData.has_existing_data) {
      setScrapedData((pageData.existing_data || []).map((item: any) => ({ ...item, selected: false })));
    }
    setBlacklist(pageData.blacklist || []);

    if (pageData.active_job) {
      console.log("Found active scraping job:", pageData.active_job);
      setRetryLoading('scraping');
      setActiveJobId(pageData.active_job.id);
      pollScrapingStatus(pageData.active_job.id);
    }
  }, [pageData]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };
  }, []);

  const updateBlacklist = async (newList: string[]) => {
      try {
          const res = await fetch(`${config.serverUrl}/api/scrape/blacklist/`, {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${authKey!}`,
              },
              body: JSON.stringify({ domain, blacklist: newList }),
          });
          const data = await res.json();
          if (res.ok) {
              setBlacklist(data.blacklist);
              return true;
          } else {
              addToast({ title: "Error", description: "Failed to update blacklist", color: "danger" });
              return false;
          }
      } catch (e) {
          addToast({ title: "Error", description: "Error updating blacklist", color: "danger" });
          return false;
      }
  };

  const handleShowAddMorePages = async () => {
    setRetryLoading('finding-pages');
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
      setRetryLoading(null);
    }
  };

  const handleScrapeAdditionalPages = async (usePlaywrightFn = false) => {
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
      console.log("[handleScrapeAdditionalPages] Scraping additional pages:", selectedAdditionalUrls.length, "Playwright:", usePlaywrightFn);
      const data = await makeApiCall(
        `${config.serverUrl}/api/scrape/additional/`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ 
            url, 
            additional_urls: selectedAdditionalUrls,
            use_playwright: usePlaywrightFn
          }),
        },
        "scrape-additional"
      );

      // Backend returns all_data, let's update scrapedData
      if (data.all_data) {
          setScrapedData((data.all_data || []).map((item: any) => ({ ...item, selected: false })));
      } else {
          // Revalidate SWR cache to reload data
          revalidate();
      }

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

  const handleAddAdditionalUrl = () => {
    try {
      if (!newAdditionalUrl.trim()) return;

      // Validate URL format
      try {
        new URL(newAdditionalUrl);
      } catch {
        addToast({ title: "Error", description: "Invalid URL format.", color: "danger" });
        return;
      }
      
      if (!additionalUrls.some(item => item.url === newAdditionalUrl)) {
          setAdditionalUrls(prev => [...prev, { url: newAdditionalUrl, selected: true }]);
           setNewAdditionalUrl("");
      } else {
          addToast({ title: "Info", description: "URL already in list", color: "primary" });
      }

    } catch (error: any) {
      logError("handleAddAdditionalUrl", error, { newAdditionalUrl });
      addToast({ title: "Error", description: "Failed to add the URL.", color: "danger" });
    }
  };
   
  const handleToggleAdditionalUrl = (urlToToggle: string) => {
    setAdditionalUrls(prev =>
        prev.map(item =>
        item.url === urlToToggle ? { ...item, selected: !item.selected } : item
        )
    );
  };

  const handleBlacklistItems = (items: string[]) => {
      if (!items.length) return;
      setItemsToBlacklist(items);
      blacklistModal.onOpen();
  };

  const confirmBlacklistItems = async () => {
      const items = itemsToBlacklist;
      blacklistModal.onClose();
      
      setActionLoading(true);
      
      // 1. Update Blacklist
      const uniqueItems = items.filter(item => !blacklist.includes(item));
      const newList = [...blacklist, ...uniqueItems];
      const success = await updateBlacklist(newList);
      
      if (success) {
          // 2. Delete from scraped data
          try {
              await makeApiCall(
                  `${config.serverUrl}/api/scrape/items/delete/`,
                  {
                      method: "DELETE",
                      headers: getAuthHeaders(),
                      body: JSON.stringify({ urls: items, domain }),
                  },
                  "delete-blacklisted-items"
              );
              
              setScrapedData(prev => prev.filter(p => !items.includes(p.url)));
              addToast({ title: "Success", description: "Items blacklisted and removed", color: "success" });
          } catch (e) {
              console.error("Failed to delete items after blacklisting", e);
              addToast({ title: "Warning", description: "Items blacklisted but failed to delete from current data", color: "warning" });
          }
      }
      setActionLoading(false);
      setItemsToBlacklist([]);
  };

  const pollScrapingStatus = useCallback(async (jobId: string) => {
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
            pollingTimerRef.current = setTimeout(poll, 6000);
        }
      } catch (e) {
          console.error("Polling failed", e);
          pollingTimerRef.current = setTimeout(poll, 10000);
      }
    };
    poll();
  }, [authKey, domain]);

  const handleOpenRetryModal = () => {
      rescrapeModal.onOpen();
  };

  const confirmRescrape = () => {
      rescrapeModal.onClose();
      handleRetryScraping(true);
  };

  const handleRescrapePages = async (urlsToRescrape: string[], options?: { keepImages: boolean; useAI: boolean; usePlaywright?: boolean }) => {
    if (urlsToRescrape.length === 0) return;

    setRetryLoading('scraping');
    clearMessages();
    setScrapingProgress({ current: 0, total: urlsToRescrape.length, status: 'pending' });

    try {
      console.log("[handleRescrapePages] Re-scraping pages:", urlsToRescrape.length, options);
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
            use_ai: options?.useAI ?? useAI,
            keep_images: options?.keepImages ?? false,
            use_playwright: options?.usePlaywright ?? usePlaywright
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
          
          // Revalidate SWR cache to reload data
          revalidate();
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

  const handleFindMorePages = async () => {
    setRetryLoading('finding-pages');
    clearMessages();
    
    try {
      console.log("[handleFindMorePages] Fetching additional URLs");
      const data = await makeApiCall(
        `${config.serverUrl}/api/scrape/get-urls/`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ url }),
        },
        "find-more-pages"
      );

      const scrapedUrlsSet = new Set(scrapedData.map(item => item.url));
      const foundUrlsSet = new Set((data.urls || []) as string[]); // Cast to string[]
      
      // Calculate diffs
      const newUrls = (data.urls || []).filter((u: string) => !scrapedUrlsSet.has(u));
      const missingUrls = scrapedData.filter(item => !foundUrlsSet.has(item.url)).map(item => item.url);

      let successMessage = "";
      let hasChanges = false;

      // Handle additions
      if (newUrls.length > 0) {
          const newItems = newUrls.map((u: string) => ({
             url: u,
             title: "Found (Not Scraped)",
             content: "",
             textLength: 0,
             main: false,
             selected: false
          }));
          setScrapedData(prev => [...prev, ...newItems]);
          successMessage += `Found ${newUrls.length} new pages. `;
          hasChanges = true;
      }

      // Handle removals
      if (missingUrls.length > 0) {
          // Check for partial scan limits to avoid accidental deletions
          const isPartialScan = data.total_found > (data.limited_to || data.urls?.length || 0); 
          
          if (isPartialScan) {
               addToast({
                   title: "Sync Warning",
                   description: `Scanner found ${data.total_found} pages but only returned ${data.limited_to}. ${missingUrls.length} pages were not found in this batch but won't be deleted to prevent accidental data loss.`,
                   color: "warning"
               });
          } else {
              // Perform deletion
              await makeApiCall(
                `${config.serverUrl}/api/scrape/items/delete/`,
                {
                  method: "DELETE",
                  headers: getAuthHeaders(),
                  body: JSON.stringify({ urls: missingUrls, domain }),
                },
                "delete-missing-items"
              );
              
              setScrapedData(prev => prev.filter(item => foundUrlsSet.has(item.url)));
              successMessage += `Removed ${missingUrls.length} pages that no longer exist.`;
              hasChanges = true;
          }
      }

      if (hasChanges) {
          addToast({
             title: "Sync Complete",
             description: successMessage,
             color: "success",
          });
      } else {
           addToast({
             title: "Info",
             description: "Page list is already up to date.",
             color: "primary",
          });
      }
    } catch (error: any) {
      logError("handleFindMorePages", error, { url });
      const message = error.message || "Failed to fetch additional pages";
      addToast({ title: "Error", description: message, color: "danger" });
      setErrorMessage(message);
    } finally {
      setRetryLoading(null);
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
            retry_delay: retryDelay,
            concurrency: concurrency
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
          body: JSON.stringify({ url, use_ai: useAI, update_all: false }),
        },
        "smart-rescrape-images"
      );

      // Handle deletion info in toast if available
      if (data.pages_deleted && data.pages_deleted > 0) {
          addToast({
              title: "Cleanup",
              description: `Removed ${data.pages_deleted} non-existing pages.`,
              color: "warning"
          });
      }

      // If job_id is returned, it means a background job started
      if (data.job_id) {
         setActiveJobId(data.job_id);
         setRetryLoading(null); // Stop spinner on button, let global progress take over
         return;
      }

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

  const handleUpdateImage = async (pageUrl: string, newImageUrl: string) => {
    try {
      await makeApiCall(
        `${config.serverUrl}/api/scrape/update-image/`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            domain,
            url: pageUrl,
            image_url: newImageUrl,
          }),
        },
        'updateImage'
      );

      // Update local state
      setScrapedData(prev => prev.map(item => 
        item.url === pageUrl ? { ...item, image: newImageUrl } : item
      ));

    } catch (error: any) {
      logError('handleUpdateImage', error);
      throw error; // Re-throw to be handled by the component
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

  const handleToggleMain = async (urlToToggle: string, isMain: boolean) => {
    // Check limit if turning on
    if (isMain) {
        const currentMainCount = scrapedData.filter(i => i.main).length;
        if (currentMainCount >= MAX_MAIN_PAGES) {
            addToast({
                title: "Limit Reached",
                description: `You can only have up to ${MAX_MAIN_PAGES} main pages. Unselect another page first.`,
                color: "warning"
            });
            return;
        }
    }

    // Optimistic update
    setScrapedData(prev => prev.map(item => 
        item.url === urlToToggle ? { ...item, main: isMain } : item
    ));

    try {
        await makeApiCall(
            `${config.serverUrl}/api/scrape/toggle-main/`,
            {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({ domain, url: urlToToggle, main: isMain }),
            },
            "toggle-main"
        );
        // Success - state already updated
    } catch (error: any) {
        // Revert on failure
        setScrapedData(prev => prev.map(item => 
            item.url === urlToToggle ? { ...item, main: !isMain } : item
        ));
        
        logError("handleToggleMain", error, { url: urlToToggle, isMain });
        addToast({ title: "Error", description: "Failed to update main status", color: "danger" });
    }
  };

  const handleToggleSelect = (urlToToggle: string) => {
    setScrapedData(prevData =>
      prevData.map(item =>
        item.url === urlToToggle ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const handleRescrapeSelected = () => {
    const selectedUrls = scrapedData.filter(i => i.selected).map(i => i.url);
    handleRescrapePages(selectedUrls, { keepImages, useAI, usePlaywright });
  };
  
  const handleBlacklistSelected = () => {
    const selectedUrls = scrapedData.filter(i => i.selected).map(i => i.url);
    handleBlacklistItems(selectedUrls);
  };

  if (authIsLoading) {
    return (
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <div>Loading...</div>
      </section>
    );
  }

  // Calculate stats
  const totalPages = scrapedData.length;
  const totalImages = scrapedData.filter(i => i.image).length;
  const totalWords = scrapedData.reduce((acc, i) => acc + (i.textLength || 0), 0);
  const mainPages = scrapedData.filter(i => i.main).length;

  return (
    <div className="flex flex-col gap-6 py-6 w-full">
      {isAuthenticated && (loading ? (
          <div>Loading scraping data...</div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card shadow="sm">
                  <CardBody className="py-4">
                      <p className="text-small text-default-500 uppercase font-bold">Total Pages</p>
                      <p className="text-2xl font-bold">{totalPages}</p>
                  </CardBody>
              </Card>
              <Card shadow="sm">
                  <CardBody className="py-4">
                      <p className="text-small text-default-500 uppercase font-bold">Images Found</p>
                      <p className="text-2xl font-bold">{totalImages}</p>
                  </CardBody>
              </Card>
               <Card shadow="sm">
                  <CardBody className="py-4">
                      <p className="text-small text-default-500 uppercase font-bold">Main Pages</p>
                      <p className="text-2xl font-bold">{mainPages}</p>
                  </CardBody>
              </Card>
              <Card shadow="sm">
                  <CardBody className="py-4">
                      <p className="text-small text-default-500 uppercase font-bold">Est. Tokens</p>
                      <p className="text-2xl font-bold">{(totalWords / 4).toFixed(0)}</p>
                  </CardBody>
              </Card>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold">Controls</h2>
            {isSuperAdmin ? (
              <ActionButtons
                  scrapedDataLength={scrapedData.length}
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
                  concurrency={concurrency}
                  setConcurrency={setConcurrency}
              />
            ) : (
              <Card className="bg-content2">
                <CardBody className="py-4">
                  <p className="text-sm text-default-500">
                    Scraping actions are managed by administrators. Contact your admin to re-scrape or update data.
                  </p>
                </CardBody>
              </Card>
            )}
            
            <BlacklistManager 
                blacklist={blacklist}
                onUpdate={updateBlacklist}
            />
          </div>

          {scrapingProgress && (
            <div className="w-full mt-4 p-4 border rounded-lg bg-content1 shadow-md">
              <div className="flex justify-between mb-2">
                <span className="font-semibold text-primary">Scanning in progress...</span>
                <span className="text-sm text-default-600 font-mono">
                  {scrapingProgress.current} / {scrapingProgress.total}
                </span>
              </div>
              <div className="w-full bg-default-100 rounded-full h-3 mb-3 overflow-hidden">
                <div 
                  className="bg-primary h-full transition-all duration-300 ease-out" 
                  style={{ width: `${(scrapingProgress.current / Math.max(scrapingProgress.total, 1)) * 100}%` }}
                ></div>
              </div>
              <p className="text-xs text-default-500 truncate mb-4 font-mono">
                {scrapingProgress.status === 'completed' ? 'Completed!' : 
                 scrapingProgress.status === 'failed' ? 'Failed' :
                 `Current: ${scrapingProgress.currentUrl || 'Initializing...'}`}
              </p>
              
              {scrapingProgress.pageStatuses && (
                <div className="mt-2 max-h-[300px] overflow-y-auto border rounded-md text-xs bg-white dark:bg-zinc-900">
                  <table className="w-full">
                    <thead className="bg-default-100 sticky top-0 z-10">
                      <tr>
                        <th className="p-2 text-left font-semibold">URL</th>
                        <th className="p-2 text-right font-semibold">Status</th>
                        <th className="p-2 text-right font-semibold">Code</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scrapingProgress.pageStatuses.slice().reverse().map((page, idx) => (
                        <tr key={idx} className="border-b border-default-100 hover:bg-default-50">
                          <td className="p-2 truncate max-w-[300px]" title={page.url}>{page.url}</td>
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

          <Divider className="my-2" />
          
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold">Scraped Content</h2>

          {showAddMorePages && (
            <Card className="mb-4">
              <CardBody>
                <h4 className="text-lg font-semibold mb-2">
                  Add Additional Pages
                </h4>
                <div className="flex gap-2 mb-2">
                  <Button
                    size="sm"
                    onClick={() => {
                        const newUrls = [...additionalUrls];
                        newUrls.forEach(item => item.selected = true);
                        setAdditionalUrls(newUrls);
                    }}
                  >
                    Select All
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                        const newUrls = [...additionalUrls];
                        newUrls.forEach(item => item.selected = false);
                        setAdditionalUrls(newUrls);
                    }}
                  >
                    Deselect All
                  </Button>
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-md p-2 flex flex-col gap-2 mb-2">
                  {additionalUrls.length > 0 ? (
                    additionalUrls.map((item, index) => (
                      <Checkbox
                        key={`${item.url}-${index}`}
                        isSelected={item.selected}
                        onValueChange={() => handleToggleAdditionalUrl(item.url)}
                        size="sm"
                      >
                        <span className="text-sm truncate" title={item.url}>{item.url}</span>
                      </Checkbox>
                    ))
                  ) : (
                    <p className="text-sm text-default-500">
                      No additional pages found in sitemap
                    </p>
                  )}
                </div>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newAdditionalUrl}
                    onChange={(e) => setNewAdditionalUrl(e.target.value)}
                    placeholder="Add custom URL (include http:// or https://)"
                    onKeyDown={(e) => e.key === "Enter" && handleAddAdditionalUrl()}
                  />
                  <Button 
                    onClick={handleAddAdditionalUrl}
                    isDisabled={!newAdditionalUrl.trim()}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 px-1">
                    <PlaywrightSwitch
                        isSelected={usePlaywrightForAdditional}
                        onValueChange={setUsePlaywrightForAdditional}
                        size="sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      color="primary"
                      onClick={() => handleScrapeAdditionalPages(usePlaywrightForAdditional)}
                      isLoading={retryLoading === "additional"}
                      isDisabled={additionalUrls.filter((u) => u.selected).length === 0}
                    >
                      Scrape{" "}
                      {additionalUrls.filter((u) => u.selected).length} Selected Pages
                    </Button>
                    <Button
                      variant="bordered"
                      onClick={() => {
                          setShowAddMorePages(false);
                          setAdditionalUrls([]);
                      }}
                      isDisabled={retryLoading === "additional"}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

            <ScrapedPagesTable 
                data={scrapedData}
                onToggleSelect={handleToggleSelect}
                onToggleMain={handleToggleMain}
                onSelectionChange={(urls, isSelected) => {
                     setScrapedData(prev => prev.map(item => 
                        urls.includes(item.url) ? { ...item, selected: isSelected } : item
                     ));
                }}
                onDelete={isSuperAdmin ? (url) => handleBlacklistItems([url]) : undefined}
                onRescrape={isSuperAdmin ? async (url) => handleRescrapePages([url], { keepImages, useAI, usePlaywright }) : undefined}
                onUpdateImage={isSuperAdmin ? handleUpdateImage : undefined}
                headerContent={(
                    <div className="flex flex-col md:flex-row justify-end gap-3 items-end mb-2">
                         <div className="flex flex-col gap-2 items-end w-full md:w-auto">
                            <div className="flex gap-4 items-center flex-wrap justify-end">
                                <PlaywrightSwitch 
                                    isSelected={usePlaywright} 
                                    onValueChange={setUsePlaywright} 
                                    size="sm" 
                                    color="warning" 
                                />
                                <Switch isSelected={keepImages} onValueChange={setKeepImages} size="sm">
                                    Keep old images
                                </Switch>
                                {!keepImages && (
                                    <Switch isSelected={useAI} onValueChange={setUseAI} size="sm" color="secondary">
                                        AI Image Selection
                                    </Switch>
                                )}
                            </div>
                            <div className="flex gap-3">
                                {isSuperAdmin && (
                                <Button 
                                    color="secondary" 
                                    variant="flat"
                                    isLoading={retryLoading === 'finding-pages'}
                                    onPress={handleShowAddMorePages}
                                    isDisabled={showAddMorePages}
                                >
                                    Add Pages
                                </Button>
                                )}
                                {isSuperAdmin && (
                                <Button
                                    color="danger"
                                    variant="flat"
                                    onPress={handleBlacklistSelected}
                                    isLoading={retryLoading === 'scraping'}
                                    isDisabled={!scrapedData.some(i => i.selected)}
                                >
                                    Blacklist Selected
                                </Button>
                                )}
                                {isSuperAdmin && (
                                <Button 
                                    color="primary" 
                                    isDisabled={!scrapedData.some(i => i.selected)}
                                    isLoading={retryLoading === 'scraping'}
                                    onPress={handleRescrapeSelected}
                                >
                                    Re-scrape Selected
                                </Button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            />
          </div>
        </>
      ))}

      <Modal isOpen={blacklistModal.isOpen} onClose={blacklistModal.onClose}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Confirm Blacklist</ModalHeader>
              <ModalBody>
                <p>Are you sure you want to blacklist {itemsToBlacklist.length} item(s)?</p>
                <p className="text-small text-default-500">
                   This will remove them from the list and prevent them from being scraped again.
                </p>
                <div className="max-h-32 overflow-y-auto bg-default-100 p-2 rounded-md">
                     {itemsToBlacklist.map(item => (
                         <div key={item} className="text-xs truncate">{item}</div>
                     ))}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Cancel</Button>
                <Button color="danger" onPress={confirmBlacklistItems}>Blacklist & Delete</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal isOpen={rescrapeModal.isOpen} onClose={rescrapeModal.onClose}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Confirm Full Rescrape</ModalHeader>
              <ModalBody>
                <p>Are you sure you want to re-scrape the entire site?</p>
                <p className="text-small text-default-500">
                    This will update all pages. If AI extraction is enabled, it may consume a significant amount of credits/time.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Cancel</Button>
                <Button color="primary" onPress={confirmRescrape}>Rescrape All</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
