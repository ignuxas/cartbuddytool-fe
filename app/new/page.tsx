"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Card, CardBody } from "@heroui/card";
import { useRouter } from "next/navigation";
import { addToast } from "@heroui/toast";

import PlaywrightSwitch from "../components/PlaywrightSwitch";
import UrlForm from "../components/UrlForm";
import { useAuth } from "../contexts/AuthContext";

import { config } from "@/lib/config";

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
    message: error?.message || "No error message",
    stack: error?.stack || "No stack trace",
    timestamp: new Date().toISOString(),
    errorType: typeof error,
    errorName: error?.name || "Unknown",
    errorToString: error?.toString() || "No string representation",
    additionalData: additionalData || "No additional data",
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
const makeApiCall = async (
  url: string,
  options: RequestInit,
  context: string,
) => {
  try {
    console.log(`[${context}] Making API call to:`, url);
    console.log(`[${context}] Request options:`, {
      method: options.method,
      headers: options.headers,
      bodyLength: options.body ? options.body.toString().length : 0,
    });

    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();

      console.log(`[${context}] Error response text:`, errorText);
      console.log(`[${context}] Error response status:`, response.status);
      console.log(
        `[${context}] Error response headers:`,
        Object.fromEntries(response.headers.entries()),
      );

      let errorData;

      try {
        errorData = JSON.parse(errorText);
        console.log(`[${context}] Parsed error data:`, errorData);
      } catch (parseError) {
        console.log(
          `[${context}] Failed to parse error response as JSON:`,
          parseError,
        );
        errorData = { error: errorText || `HTTP ${response.status}` };
      }

      const errorInfo = {
        url,
        status: response.status,
        statusText: response.statusText,
        errorData,
        errorText,
        responseHeaders: Object.fromEntries(response.headers.entries()),
        contentType: response.headers.get("content-type"),
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
          errorMessage =
            "Internal server error occurred. Please try again or contact support if the issue persists.";
        }
      } else {
        errorMessage =
          errorData?.error ||
          errorData?.message ||
          errorData?.detail ||
          errorText ||
          `Request failed with status ${response.status}: ${response.statusText}`;
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

    if (error.name === "AbortError") {
      logError(context, error, { url, note: "Request timeout" });
      throw new Error(
        "Request timed out. The server might be busy processing your request. Please try again.",
      );
    }

    if (error.name === "TypeError" && error.message.includes("fetch")) {
      logError(context, error, { url, note: "Network/CORS error" });
      throw new Error(
        "Network error. Please check your connection and try again.",
      );
    }

    if (error.name === "SyntaxError") {
      logError(context, error, { url, note: "JSON parsing error" });
      throw new Error("Invalid response from server. Please try again.");
    }

    throw error;
  }
};

export default function NewProjectPage() {
  const {
    isAuthenticated,
    accessToken: authKey,
    isLoading,
    isSuperAdmin,
  } = useAuth();
  const router = useRouter();

  // Redirect non-admins
  useEffect(() => {
    if (!isLoading && isAuthenticated && !isSuperAdmin) {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, isSuperAdmin, router]);

  const [url, setUrl] = useState("");

  // Handle URL query param from marketer page
  useEffect(() => {
    // Only run on client
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlParam = params.get("url");

      if (urlParam) {
        setUrl(urlParam);
      }
    }
  }, []);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [step, setStep] = useState<
    "form" | "existing" | "selection" | "main_selection"
  >("form");
  const [sitemapUrls, setSitemapUrls] = useState<
    { url: string; selected: boolean }[]
  >([]);
  const [mainPageUrls, setMainPageUrls] = useState<
    { url: string; main: boolean }[]
  >([]);
  const [newUrl, setNewUrl] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [patternInput, setPatternInput] = useState("");
  const [blacklistPatterns, setBlacklistPatterns] = useState<string[]>([]);
  const [showBlacklist, setShowBlacklist] = useState(false);
  const [mainSearchFilter, setMainSearchFilter] = useState("");
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
  const [usePlaywright, setUsePlaywright] = useState(false);
  const [sitemapJobId, setSitemapJobId] = useState<string | null>(null);
  const [sitemapProgress, setSitemapProgress] = useState<{
    status: string;
    current_url: string;
    scraped_pages: number;
    total_pages: number;
  } | null>(null);

  useEffect(() => {
    if (!sitemapJobId) return;

    let pollInterval: NodeJS.Timeout;

    const pollStatus = async () => {
      try {
        const data = await makeApiCall(
          `${config.serverUrl}/api/scrape/status/${sitemapJobId}/`,
          {
            method: "GET",
            headers: getAuthHeaders(),
          },
          "poll-sitemap",
        );

        setSitemapProgress({
          status: data.status,
          current_url: data.current_url,
          scraped_pages: data.scraped_pages,
          total_pages: data.total_pages,
        });

        if (data.status === "completed" || data.status === "failed") {
          clearInterval(pollInterval);
          setSitemapJobId(null);
          setSitemapProgress(null);

          if (data.status === "failed") {
            setErrorMessage(data.error_message || "Sitemap discovery failed.");
            setLoading(false);
          } else {
            // Handle success
            const resultStatus =
              data.page_statuses &&
              data.page_statuses.find(
                (s: any) => s.status === "sitemap_result",
              );

            if (resultStatus && resultStatus.data) {
              const result = resultStatus.data;

              if (!result.urls || result.urls.length === 0) {
                throw new Error("No URLs found.");
              }

              setSitemapUrls(
                result.urls.map((u: string) => ({ url: u, selected: true })),
              );
              setPageInfo({
                totalFound: result.total_found || result.urls.length,
                limitedTo: result.limited_to || result.urls.length,
                methodUsed: result.method_used || "sitemap",
              });
              setStep("selection");
            } else {
              setErrorMessage("Job completed but no result found.");
            }
            setLoading(false);
          }
        }
      } catch (e: any) {
        logError("pollStatus", e);
      }
    };

    pollInterval = setInterval(pollStatus, 1000);
    pollStatus();

    return () => clearInterval(pollInterval);
  }, [sitemapJobId]);

  const clearMessages = () => {
    setErrorMessage("");
  };

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${authKey!}`,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let processedUrl = url.trim();

    if (!processedUrl) {
      const message = "Please enter a valid URL";

      addToast({ title: "Error", description: message, color: "danger" });
      setErrorMessage(message);

      return;
    }

    // Auto-fix URL scheme if missing
    if (!/^https?:\/\//i.test(processedUrl)) {
      processedUrl = `https://${processedUrl}`;
      setUrl(processedUrl); // Update input field
    }

    // Validate URL format
    try {
      new URL(processedUrl);
    } catch {
      const message =
        "Please enter a valid URL (including http:// or https://)";

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

    try {
      console.log(
        "[handleSubmit] Starting submission process for URL:",
        processedUrl,
      );

      // First check if domain already has data
      const checkData = await makeApiCall(
        `${config.serverUrl}/api/scrape/check-existing/`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ url: processedUrl }),
        },
        "check-existing",
      );

      if (checkData.has_existing_data) {
        console.log(
          "[handleSubmit] Found existing data, showing existing data step",
        );
        setExistingDataInfo({
          count: checkData.count,
          existing_data: checkData.existing_data,
          existing_prompt: checkData.existing_prompt,
          existing_workflow: checkData.existing_workflow,
        });
        setStep("existing");
        setLoading(false);
      } else {
        console.log("[handleSubmit] No existing data, fetching sitemap URLs");
        // No existing data, proceed with normal flow WITH background job
        const data = await makeApiCall(
          `${config.serverUrl}/api/scrape/get-urls/`,
          {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ url: processedUrl, background: true }),
          },
          "get-urls",
        );

        if (data.job_id) {
          setSitemapJobId(data.job_id);

          return;
        }

        if (!data.urls || data.urls.length === 0) {
          throw new Error(
            "No URLs found in sitemap. The website might not have a sitemap or it might be empty.",
          );
        }

        setSitemapUrls(
          data.urls.map((u: string) => ({ url: u, selected: true })),
        );
        setPageInfo({
          totalFound: data.total_found || data.urls.length,
          limitedTo: data.limited_to || data.urls.length,
          methodUsed: data.method_used || "sitemap",
        });

        setStep("selection");
        setLoading(false);
      }
    } catch (error: any) {
      logError("handleSubmit", error, { url });
      const message =
        error.message ||
        "An unexpected error occurred while processing your request";

      addToast({ title: "Error", description: message, color: "danger" });
      setErrorMessage(message);
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

    try {
      console.log("[handleRescanWebsite] Rescanning website");
      const data = await makeApiCall(
        `${config.serverUrl}/api/scrape/get-urls/`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ url }),
        },
        "rescan-website",
      );

      if (!data.urls || data.urls.length === 0) {
        throw new Error("No URLs found in sitemap during rescan");
      }

      setSitemapUrls(
        data.urls.map((u: string) => ({ url: u, selected: true })),
      );
      setPageInfo({
        totalFound: data.total_found || data.urls.length,
        limitedTo: data.limited_to || data.urls.length,
        methodUsed: data.method_used || "sitemap",
      });

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
    const selectedUrls = sitemapUrls
      .filter((item) => item.selected)
      .map((item) => item.url);

    if (selectedUrls.length === 0) {
      const message = "Please select at least one URL to scrape.";

      addToast({ title: "Error", description: message, color: "danger" });
      setErrorMessage(message);

      return;
    }

    // Initialize main page selection (default: none selected)
    setMainPageUrls(
      selectedUrls.map((url) => {
        return { url, main: false };
      }),
    );

    setStep("main_selection");
  };

  const handleStartScraping = async () => {
    const selectedUrls = sitemapUrls
      .filter((item) => item.selected)
      .map((item) => item.url);
    const unselectedUrls = sitemapUrls
      .filter((item) => !item.selected)
      .map((item) => item.url);
    const mainUrls = mainPageUrls
      .filter((item) => item.main)
      .map((item) => item.url);

    if (selectedUrls.length === 0) {
      const message = "Please select at least one URL to scrape.";

      addToast({ title: "Error", description: message, color: "danger" });
      setErrorMessage(message);

      return;
    }

    setLoading(true);
    clearMessages();

    try {
      console.log(
        "[handleStartScraping] Starting scraping process for",
        selectedUrls.length,
        "URLs",
      );

      const domain = new URL(url).hostname;

      // Blacklist unselected URLs
      if (unselectedUrls.length > 0) {
        try {
          console.log(
            "[handleStartScraping] Blacklisting",
            unselectedUrls.length,
            "unselected URLs",
          );

          try {
            const blacklistRes = await makeApiCall(
              `${config.serverUrl}/api/scrape/blacklist/?domain=${domain}`,
              { headers: getAuthHeaders(), method: "GET" },
              "fetch-blacklist",
            );
            const existingBlacklist = blacklistRes.blacklist || [];
            const newBlacklist = [
              ...existingBlacklist,
              ...unselectedUrls,
              ...blacklistPatterns,
            ];
            const uniqueBlacklist = Array.from(new Set(newBlacklist));

            if (uniqueBlacklist.length > existingBlacklist.length) {
              await makeApiCall(
                `${config.serverUrl}/api/scrape/blacklist/`,
                {
                  method: "POST",
                  headers: getAuthHeaders(),
                  body: JSON.stringify({ domain, blacklist: uniqueBlacklist }),
                },
                "save-blacklist",
              );
            }
          } catch (e) {
            console.warn("Error managing blacklist", e);
          }
        } catch (e) {
          console.warn("Failed to blacklist unselected URLs", e);
        }
      }

      const requestBody = {
        url,
        urls_to_scrape: selectedUrls,
        main_page_urls: mainUrls,
        use_playwright: usePlaywright,
      };

      console.log("[handleStartScraping] Request body:", requestBody);

      const result = await makeApiCall(
        `${config.serverUrl}/api/scrape/`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(requestBody),
        },
        "start-scraping",
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
        errorName: error?.name,
      });

      // More specific error messages based on error type
      let userMessage = "Failed to scrape the selected pages";

      if (error?.message) {
        if (error.message.includes("Network error")) {
          userMessage =
            "Network error. Please check your connection and try again.";
        } else if (error.message.includes("timeout")) {
          userMessage =
            "Request timed out. The server might be busy. Please try again.";
        } else if (error.message.includes("500")) {
          userMessage =
            "Server error occurred while scraping. Please try again later.";
        } else if (
          error.message.includes("blocking automated requests") ||
          error.message.includes("anti-bot protection")
        ) {
          userMessage =
            "The website is blocking automated scraping. This website has protection against bots. Try selecting fewer pages, or this website may not be suitable for automated scraping.";
        } else if (
          error.message.includes("All") &&
          error.message.includes("pages failed")
        ) {
          userMessage =
            "Unable to scrape any pages from this website. The site may have anti-bot protection or be temporarily unavailable. Please try a different website.";
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
      setSitemapUrls((prev) =>
        prev.map((item) =>
          item.url === urlToToggle
            ? { ...item, selected: !item.selected }
            : item,
        ),
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

      let processedUrl = newUrl.trim();

      if (!/^https?:\/\//i.test(processedUrl)) {
        processedUrl = `https://${processedUrl}`;
      }

      // Validate URL format
      try {
        new URL(processedUrl);
      } catch {
        const message =
          "Please enter a valid URL (including http:// or https://)";

        addToast({ title: "Error", description: message, color: "danger" });
        setErrorMessage(message);

        return;
      }

      // Check for duplicates
      if (sitemapUrls.some((item) => item.url === processedUrl)) {
        const message = "This URL is already in the list";

        addToast({ title: "Error", description: message, color: "danger" });
        setErrorMessage(message);

        return;
      }

      setSitemapUrls((prev) => [
        ...prev,
        { url: processedUrl, selected: true },
      ]);
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
      setSitemapUrls((prev) =>
        prev.map((item) => ({ ...item, selected: select })),
      );
    } catch (error: any) {
      logError("handleSelectAll", error, { select });
    }
  };

  const handleSelectFiltered = (select: boolean) => {
    if (!searchFilter.trim()) return handleSelectAll(select);
    const filter = searchFilter.toLowerCase();

    setSitemapUrls((prev) =>
      prev.map((item) =>
        item.url.toLowerCase().includes(filter)
          ? { ...item, selected: select }
          : item,
      ),
    );
  };

  const handleDeselectByPattern = (pattern: string) => {
    if (!pattern.trim()) return;
    const pat = pattern.toLowerCase();

    setSitemapUrls((prev) =>
      prev.map((item) =>
        item.url.toLowerCase().includes(pat)
          ? { ...item, selected: false }
          : item,
      ),
    );
  };

  const handleRemoveUrl = (urlToRemove: string) => {
    setSitemapUrls((prev) => prev.filter((item) => item.url !== urlToRemove));
  };

  const handleAddBlacklistPattern = (pattern: string) => {
    if (!pattern.trim()) return;
    const trimmed = pattern.trim();

    if (blacklistPatterns.includes(trimmed)) {
      addToast({
        title: "Info",
        description: "Pattern already exists",
        color: "primary",
      });

      return;
    }
    setBlacklistPatterns((prev) => [...prev, trimmed]);
    // Also deselect matching URLs
    handleDeselectByPattern(trimmed);
    setPatternInput("");
    addToast({
      title: "Success",
      description: `Pattern "${trimmed}" added — matching URLs deselected`,
      color: "success",
    });
  };

  const handleRemoveBlacklistPattern = (pattern: string) => {
    setBlacklistPatterns((prev) => prev.filter((p) => p !== pattern));
    addToast({
      title: "Success",
      description: "Pattern removed",
      color: "success",
    });
  };

  // Filter URLs based on search and blacklist
  const filteredSitemapUrls = React.useMemo(() => {
    let items = sitemapUrls;

    if (searchFilter.trim()) {
      const filter = searchFilter.toLowerCase();

      items = items.filter((item) => item.url.toLowerCase().includes(filter));
    }

    return items;
  }, [sitemapUrls, searchFilter]);

  const filteredMainPageUrls = React.useMemo(() => {
    if (!mainSearchFilter.trim()) return mainPageUrls;
    const filter = mainSearchFilter.toLowerCase();

    return mainPageUrls.filter((item) =>
      item.url.toLowerCase().includes(filter),
    );
  }, [mainPageUrls, mainSearchFilter]);

  // URL category stats
  const urlStats = React.useMemo(() => {
    const selected = sitemapUrls.filter((u) => u.selected).length;
    const total = sitemapUrls.length;
    const categories: Record<string, number> = {};

    sitemapUrls.forEach((item) => {
      try {
        const path = new URL(item.url).pathname;
        const segments = path.split("/").filter(Boolean);
        const cat = segments.length > 0 ? `/${segments[0]}/` : "/";

        categories[cat] = (categories[cat] || 0) + 1;
      } catch {
        /* ignore */
      }
    });
    const sortedCategories = Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return { selected, total, sortedCategories };
  }, [sitemapUrls]);

  const handleToggleMainSelection = (urlToToggle: string) => {
    try {
      const targetItem = mainPageUrls.find((item) => item.url === urlToToggle);

      // Check limit before enabling a new one
      if (targetItem && !targetItem.main) {
        const currentSelected = mainPageUrls.filter((item) => item.main).length;

        if (currentSelected >= 5) {
          alert("Maximum 5 main pages allowed.");

          return;
        }
      }

      setMainPageUrls((prev) =>
        prev.map((item) =>
          item.url === urlToToggle ? { ...item, main: !item.main } : item,
        ),
      );
    } catch (error: any) {
      logError("handleToggleMainSelection", error, { urlToToggle });
    }
  };

  const handleSelectAllMain = (select: boolean) => {
    try {
      if (select && mainPageUrls.length > 5) {
        alert(
          "Cannot select all pages as main. Maximum 5 allowed. Please select individually.",
        );

        return;
      }
      setMainPageUrls((prev) =>
        prev.map((item) => ({ ...item, main: select })),
      );
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
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <div className="inline-block text-center justify-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">New Project</h1>
          <h2 className="text-lg md:text-xl text-muted-foreground">
            Enter your website URL to get started.
          </h2>
          <Button
            className="mt-2"
            size="sm"
            variant="light"
            onPress={() => router.push("/")}
          >
            Back to Dashboard
          </Button>
        </div>

        {isAuthenticated && (
          <div className="w-full flex flex-col items-center gap-4">
            <UrlForm
              handleSubmit={handleSubmit}
              loading={loading}
              retryLoading={null}
              setUrl={setUrl}
              url={url}
            />

            {sitemapProgress && (
              <div className="w-full max-w-lg mt-4 p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                    <span className="text-sm font-medium">
                      Scanning Sitemap...
                    </span>
                  </div>
                  {sitemapProgress.scraped_pages > 0 && (
                    <span className="text-xs text-gray-500">
                      Found {sitemapProgress.scraped_pages} URLs
                    </span>
                  )}
                </div>
                <div
                  className="text-xs text-gray-500 truncate w-full"
                  title={sitemapProgress.current_url}
                >
                  {sitemapProgress.current_url || "Initializing..."}
                </div>
              </div>
            )}
          </div>
        )}

        {step === "existing" && existingDataInfo && (
          <Card className="w-full max-w-2xl">
            <CardBody className="flex flex-col gap-4">
              <h3 className="text-xl font-bold">Existing Data Found</h3>
              <p>
                This website has already been scanned with{" "}
                {existingDataInfo.count} pages.
              </p>
              <div className="flex gap-2">
                <Button color="primary" onClick={handleUseExistingData}>
                  Use Existing Data
                </Button>
                <Button
                  isLoading={loading}
                  variant="bordered"
                  onClick={handleRescanWebsite}
                >
                  Rescan Website
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {step === "selection" && (
          <div className="w-full flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h3 className="text-xl font-bold">Select pages to scrape</h3>
              {pageInfo && (
                <div className="text-sm text-muted-foreground">
                  Found {pageInfo.totalFound} pages using{" "}
                  {pageInfo.methodUsed === "fallback_crawling"
                    ? "fallback crawling"
                    : "sitemap"}
                </div>
              )}

              {/* Stats bar */}
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">
                  {urlStats.selected} / {urlStats.total} selected
                </span>
                {blacklistPatterns.length > 0 && (
                  <span className="px-3 py-1 rounded-full bg-danger/10 text-danger font-medium">
                    {blacklistPatterns.length} blacklist pattern
                    {blacklistPatterns.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
                <CardBody className="py-3">
                  <div className="flex items-start gap-2">
                    <div className="text-blue-600 dark:text-blue-400 mt-0.5">
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          clipRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          fillRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                        💡 Page Selection Tips
                      </p>
                      <ul className="text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                        <li>
                          <strong>Select main pages</strong>: Home, About,
                          Services, Contact, FAQ
                        </li>
                        <li>
                          <strong>Skip individual posts/products</strong>: The
                          AI can access these via your website&apos;s API or
                          search
                        </li>
                        <li>
                          <strong>Focus on static content</strong>: Policy
                          pages, company info, service descriptions
                        </li>
                        <li>
                          <strong>Use blacklist patterns</strong>: Exclude
                          entire URL groups like /blog/ or /tag/
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Search bar */}
            <Input
              isClearable
              placeholder="Search URLs..."
              startContent={
                <svg
                  aria-hidden="true"
                  className="text-default-400"
                  fill="none"
                  focusable="false"
                  height="1em"
                  role="presentation"
                  viewBox="0 0 24 24"
                  width="1em"
                >
                  <path
                    d="M11.5 21C16.7467 21 21 16.7467 21 11.5C21 6.25329 16.7467 2 11.5 2C6.25329 2 2 6.25329 2 11.5C2 16.7467 6.25329 21 11.5 21Z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                  <path
                    d="M22 22L20 20"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
              }
              value={searchFilter}
              onClear={() => setSearchFilter("")}
              onValueChange={setSearchFilter}
            />

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => handleSelectAll(true)}>
                Select All
              </Button>
              <Button size="sm" onClick={() => handleSelectAll(false)}>
                Deselect All
              </Button>
              {searchFilter && (
                <>
                  <Button
                    color="primary"
                    size="sm"
                    variant="flat"
                    onClick={() => handleSelectFiltered(true)}
                  >
                    Select Filtered ({filteredSitemapUrls.length})
                  </Button>
                  <Button
                    color="warning"
                    size="sm"
                    variant="flat"
                    onClick={() => handleSelectFiltered(false)}
                  >
                    Deselect Filtered ({filteredSitemapUrls.length})
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="bordered"
                onClick={() => {
                  setSitemapUrls((prev) =>
                    prev.map((item) => {
                      const url = item.url.toLowerCase();
                      const isMainPage =
                        url.includes("/about") ||
                        url.includes("/contact") ||
                        url.includes("/service") ||
                        url.includes("/home") ||
                        url.includes("/faq") ||
                        url.includes("/privacy") ||
                        url.includes("/terms") ||
                        url.includes("/policy") ||
                        url === new URL(url).origin + "/" ||
                        (!url.includes("/blog/") &&
                          !url.includes("/product/") &&
                          !url.includes("/post/") &&
                          !url.includes("/item/") &&
                          !url.includes("/category/") &&
                          !url.includes("/tag/") &&
                          !url.match(/\/\d{4}\//) &&
                          !url.match(/\/page\/\d+/));

                      return { ...item, selected: isMainPage };
                    }),
                  );
                }}
              >
                Smart Select
              </Button>
              <Button
                color="danger"
                size="sm"
                variant={showBlacklist ? "solid" : "bordered"}
                onClick={() => setShowBlacklist(!showBlacklist)}
              >
                {showBlacklist ? "Hide" : "Show"} Blacklist (
                {blacklistPatterns.length})
              </Button>
            </div>

            {/* Inline Blacklist Manager */}
            {showBlacklist && (
              <Card className="border-danger-200 dark:border-danger-800">
                <CardBody className="flex flex-col gap-3">
                  <p className="text-sm font-semibold">
                    URL Blacklist Patterns
                  </p>
                  <p className="text-xs text-default-500">
                    Add URL patterns to exclude. Matching URLs will be
                    auto-deselected. Patterns use simple text matching (e.g.
                    &quot;/blog/&quot; matches any URL containing /blog/).
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter pattern (e.g. /blog/, /tag/, /page/)"
                      size="sm"
                      value={patternInput}
                      onChange={(e) => setPatternInput(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        handleAddBlacklistPattern(patternInput)
                      }
                    />
                    <Button
                      color="danger"
                      isDisabled={!patternInput.trim()}
                      size="sm"
                      variant="flat"
                      onClick={() => handleAddBlacklistPattern(patternInput)}
                    >
                      Add
                    </Button>
                  </div>
                  {/* Quick-add common patterns */}
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs text-default-400 mr-1 self-center">
                      Quick add:
                    </span>
                    {[
                      "/blog/",
                      "/tag/",
                      "/category/",
                      "/author/",
                      "/page/",
                      "/cart/",
                      "/checkout/",
                      "/wp-admin/",
                      "/wp-json/",
                      "/feed/",
                    ].map((p) => (
                      <Button
                        key={p}
                        className="h-6 text-xs min-w-0 px-2"
                        isDisabled={blacklistPatterns.includes(p)}
                        size="sm"
                        variant="flat"
                        onClick={() => handleAddBlacklistPattern(p)}
                      >
                        {p}
                      </Button>
                    ))}
                  </div>
                  {blacklistPatterns.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {blacklistPatterns.map((pattern) => {
                        const matchCount = sitemapUrls.filter((u) =>
                          u.url.toLowerCase().includes(pattern.toLowerCase()),
                        ).length;

                        return (
                          <span
                            key={pattern}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-danger/10 text-danger text-xs"
                          >
                            {pattern}
                            <span className="text-default-400">
                              ({matchCount})
                            </span>
                            <button
                              className="ml-0.5 hover:text-danger-600 font-bold"
                              onClick={() =>
                                handleRemoveBlacklistPattern(pattern)
                              }
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </CardBody>
              </Card>
            )}

            {/* URL categories breakdown */}
            {urlStats.sortedCategories.length > 1 && (
              <div className="flex flex-wrap gap-1 items-center">
                <span className="text-xs text-default-400 mr-1">
                  Path groups:
                </span>
                {urlStats.sortedCategories.map(([cat, count]) => (
                  <button
                    key={cat}
                    className="text-xs px-2 py-0.5 rounded-full bg-default-100 hover:bg-default-200 dark:bg-default-50 dark:hover:bg-default-100 transition-colors cursor-pointer"
                    title={`Click to filter by ${cat}`}
                    onClick={() => setSearchFilter(cat)}
                  >
                    {cat} <span className="text-default-400">({count})</span>
                  </button>
                ))}
              </div>
            )}

            {/* URL table */}
            <div className="max-h-80 overflow-y-auto border rounded-md">
              <table className="w-full">
                <thead className="sticky top-0 bg-gray-800 dark:bg-gray-900 border-b border-gray-600">
                  <tr>
                    <th className="w-12 text-left">
                      <input
                        aria-label="Select all visible URLs"
                        checked={
                          filteredSitemapUrls.length > 0 &&
                          filteredSitemapUrls.every((item) => item.selected)
                        }
                        className="rounded ml-2"
                        type="checkbox"
                        onChange={(e) => {
                          if (searchFilter) {
                            handleSelectFiltered(e.target.checked);
                          } else {
                            handleSelectAll(e.target.checked);
                          }
                        }}
                      />
                    </th>
                    <th className="text-left text-sm font-medium pl-2">URL</th>
                    <th className="w-10 text-center text-sm font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {filteredSitemapUrls.length === 0 ? (
                    <tr>
                      <td
                        className="text-center text-sm text-default-400 py-8"
                        colSpan={3}
                      >
                        {searchFilter
                          ? "No URLs match your search"
                          : "No URLs found"}
                      </td>
                    </tr>
                  ) : (
                    filteredSitemapUrls.map((item, index) => {
                      const isBlacklisted = blacklistPatterns.some((p) =>
                        item.url.toLowerCase().includes(p.toLowerCase()),
                      );

                      return (
                        <tr
                          key={`${item.url}-${index}`}
                          className={`border-b border-gray-600 hover:bg-gray-700 dark:hover:bg-gray-800 ${
                            isBlacklisted ? "opacity-50" : ""
                          }`}
                        >
                          <td>
                            <input
                              aria-label={`Select ${item.url}`}
                              checked={item.selected}
                              className="rounded ml-2"
                              type="checkbox"
                              onChange={() =>
                                handleToggleUrlSelection(item.url)
                              }
                            />
                          </td>
                          <td className="text-sm pl-2 py-1" title={item.url}>
                            <span
                              className={isBlacklisted ? "line-through" : ""}
                            >
                              {item.url}
                            </span>
                            {isBlacklisted && (
                              <span className="ml-2 text-xs text-danger">
                                blacklisted
                              </span>
                            )}
                          </td>
                          <td className="text-center">
                            <button
                              className="text-default-400 hover:text-danger text-sm px-1"
                              title="Remove URL from list"
                              onClick={() => handleRemoveUrl(item.url)}
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Showing X of Y indicator */}
            {searchFilter && (
              <div className="text-xs text-default-400">
                Showing {filteredSitemapUrls.length} of {sitemapUrls.length}{" "}
                URLs
              </div>
            )}

            {/* Add URL */}
            <div className="flex gap-2">
              <Input
                placeholder="Add another URL (e.g. example.com/page)"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
              />
              <Button disabled={newUrl.trim() === ""} onClick={handleAddUrl}>
                Add
              </Button>
            </div>
            <Button
              color="primary"
              disabled={loading}
              onClick={handleProceedToMainSelection}
            >
              Next: Select Main Pages (
              {sitemapUrls.filter((u) => u.selected).length} pages)
            </Button>
          </div>
        )}

        {step === "main_selection" && (
          <div className="w-full flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h3 className="text-xl font-bold">Select Main Pages</h3>
              <p className="text-sm text-muted-foreground">
                Main pages will be always available to the shopping assistant as
                context, while other pages will be vectorized for semantic
                search.
              </p>
              {/* Search bar for main pages */}
              <Input
                isClearable
                placeholder="Search selected URLs..."
                size="sm"
                startContent={
                  <svg
                    aria-hidden="true"
                    className="text-default-400"
                    fill="none"
                    focusable="false"
                    height="1em"
                    role="presentation"
                    viewBox="0 0 24 24"
                    width="1em"
                  >
                    <path
                      d="M11.5 21C16.7467 21 21 16.7467 21 11.5C21 6.25329 16.7467 2 11.5 2C6.25329 2 2 6.25329 2 11.5C2 16.7467 6.25329 21 11.5 21Z"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                    <path
                      d="M22 22L20 20"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                }
                value={mainSearchFilter}
                onClear={() => setMainSearchFilter("")}
                onValueChange={setMainSearchFilter}
              />
              <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
                <CardBody className="py-3">
                  <div className="flex items-start gap-2">
                    <div className="text-green-600 dark:text-green-400 mt-0.5">
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          clipRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          fillRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-green-800 dark:text-green-200 mb-1">
                        💡 Main Pages Guidelines
                      </p>
                      <ul className="text-green-700 dark:text-green-300 space-y-1 list-disc list-inside">
                        <li>
                          <strong>Always available</strong>: Main pages are
                          always accessible to the AI as context
                        </li>
                        <li>
                          <strong>Static content</strong>: Choose pages with
                          core business information
                        </li>
                        <li>
                          <strong>Essential pages</strong>: Home, About,
                          Services, Contact, FAQ, Policies
                        </li>
                        <li>
                          <strong>Limit recommendation</strong>: Maximum 5 main
                          pages allowed for optimal performance
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleSelectAllMain(true)}>
                Select All as Main
              </Button>
              <Button size="sm" onClick={() => handleSelectAllMain(false)}>
                Deselect All Main
              </Button>
              <Button
                size="sm"
                variant="bordered"
                onClick={() => {
                  // Smart selection for main pages
                  setMainPageUrls((prev) => {
                    let count = 0;

                    return prev.map((item) => {
                      const url = item.url.toLowerCase();
                      let isMainPage =
                        url.includes("/about") ||
                        url.includes("/contact") ||
                        url.includes("/service") ||
                        url.includes("/home") ||
                        url.includes("/faq") ||
                        url.includes("/privacy") ||
                        url.includes("/terms") ||
                        url.includes("/policy") ||
                        item.url === new URL(item.url).origin + "/" ||
                        (!url.includes("/blog/") &&
                          !url.includes("/product/") &&
                          !url.includes("/post/") &&
                          !url.includes("/item/") &&
                          !url.includes("/category/") &&
                          !url.includes("/tag/") &&
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
                        aria-label="Select all URLs as main"
                        checked={
                          mainPageUrls.length > 0 &&
                          mainPageUrls.every((item) => item.main)
                        }
                        className="rounded ml-2"
                        type="checkbox"
                        onChange={(e) => handleSelectAllMain(e.target.checked)}
                      />
                    </th>
                    <th className="text-left text-sm font-medium pl-2">URL</th>
                    <th className="text-left text-sm font-medium pl-2">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMainPageUrls.length === 0 ? (
                    <tr>
                      <td
                        className="text-center text-sm text-default-400 py-8"
                        colSpan={3}
                      >
                        {mainSearchFilter
                          ? "No URLs match your search"
                          : "No URLs"}
                      </td>
                    </tr>
                  ) : (
                    filteredMainPageUrls.map((item, index) => (
                      <tr
                        key={`${item.url}-${index}`}
                        className="border-b border-gray-600 hover:bg-gray-700 dark:hover:bg-gray-800"
                      >
                        <td>
                          <input
                            aria-label={`Select ${item.url} as main`}
                            checked={item.main}
                            className="rounded ml-2"
                            type="checkbox"
                            onChange={() => handleToggleMainSelection(item.url)}
                          />
                        </td>
                        <td className="text-sm pl-2" title={item.url}>
                          {item.url}
                        </td>
                        <td className="text-sm pl-2">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              item.main
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            }`}
                          >
                            {item.main ? "Main" : "Vectorized"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center gap-4">
              <PlaywrightSwitch
                isSelected={usePlaywright}
                onValueChange={setUsePlaywright}
              />
              <div className="flex gap-2">
                <Button variant="bordered" onClick={() => setStep("selection")}>
                  Back to Page Selection
                </Button>
                <Button
                  color="primary"
                  disabled={loading}
                  isLoading={loading}
                  onClick={handleStartScraping}
                >
                  Scrape {sitemapUrls.filter((u) => u.selected).length} Pages (
                  {mainPageUrls.filter((u) => u.main).length} main,{" "}
                  {mainPageUrls.filter((u) => !u.main).length} vectorized)
                </Button>
              </div>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="w-full max-w-2xl">
            {/* Show helpful tips for common scraping issues */}
            {errorMessage &&
              (errorMessage.includes("blocking") ||
                errorMessage.includes("anti-bot") ||
                errorMessage.includes("failed to scrape")) && (
                <Card className="mt-4">
                  <CardBody className="flex flex-col gap-3">
                    <h4 className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                      Scraping Tips
                    </h4>
                    <div className="text-sm space-y-2">
                      <p>
                        • Some websites block automated scraping to protect
                        their content
                      </p>
                      <p>
                        • Try selecting fewer pages (5-10 main pages) instead of
                        all pages
                      </p>
                      <p>
                        • Focus on static pages like About, Services, Contact
                        rather than blog posts
                      </p>
                      <p>
                        • Government and news websites often have stronger
                        protection
                      </p>
                      <p>
                        • Consider trying a different website that&apos;s more
                        scraping-friendly
                      </p>
                      <p>
                        • Blogs, documentation sites, and business websites
                        typically work better
                      </p>
                    </div>
                  </CardBody>
                </Card>
              )}

            {/* Show page limit guidance - REMOVED */}
          </div>
        )}
      </section>
    </>
  );
}
