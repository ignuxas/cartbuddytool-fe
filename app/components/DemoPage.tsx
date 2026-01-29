"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { config } from "@/lib/config";
import { addToast } from "@heroui/toast";
import { Button } from "@heroui/button";
import { Tooltip } from "@heroui/tooltip";
import { useAuth } from "@/app/contexts/AuthContext";
import DemoPreview from "./DemoPreview";

interface WidgetSettings {
  primary_color: string;
  secondary_color: string;
  background_color?: string;
  text_color: string;
  title: string;
  welcome_message: string;
  suggestions: string[];
  bubble_greeting_text: string;
  bubble_button_text: string;
  input_placeholder: string;
  footer_text: string;
  view_product_text: string;
  webhook_url?: string;
  bot_icon?: string;
}

export default function DemoPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, authKey } = useAuth();
  const domain = searchParams.get("domain");
  const webhookUrl = searchParams.get("webhook");
  
  const [loading, setLoading] = useState(true);
  const [refreshingScreenshot, setRefreshingScreenshot] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [fromCache, setFromCache] = useState(false);
  const maxRetries = 2;

  useEffect(() => {
    if (!domain) {
      setError("Missing required parameter: domain");
      setLoading(false);
      return;
    }

    loadDemoContent();
  }, [domain, webhookUrl]);

  const loadDemoContent = async (forceRefresh: boolean = false) => {
    try {
      if (forceRefresh) {
        setRefreshingScreenshot(true);
      } else {
        setLoading(true);
      }
      setError(null);
      if (!forceRefresh) {
        setHtmlContent(""); // Clear previous content only on initial load
      }

      console.log("Loading demo for domain:", domain, "forceRefresh:", forceRefresh);

      // Load widget settings (public endpoint, no auth required)
      const settingsResponse = await fetch(
        `${config.serverUrl}/api/widget/settings/?domain=${encodeURIComponent(domain!)}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!settingsResponse.ok) {
        throw new Error("Failed to load widget settings");
      }

      const settings = await settingsResponse.json();
      setWidgetSettings(settings);
      console.log("Widget settings loaded:", settings);

      // Webhook Strategy: 
      // 1. Prefer webhookUrl from URL param (if passed explicitly)
      // 2. Fallback to settings.webhook_url (from backend WidgetCustomization/migration)
      // 3. Fallback to standard backend chat endpoint construction
      
      let effectiveWebhookUrl = webhookUrl;
      
      if (!effectiveWebhookUrl) {
          if (settings.webhook_url && settings.webhook_url.length > 0) {
              effectiveWebhookUrl = settings.webhook_url;
          } else {
               // Default to this app's server chat endpoint
               effectiveWebhookUrl = `${config.serverUrl}/api/chat/`;
          }
      }
      
      console.log("Using Webhook URL:", effectiveWebhookUrl);

      // Fetch the website screenshot (public endpoint, no auth required)
      console.log("Fetching screenshot from server for domain:", domain);
      const htmlResponse = await fetch(
        `${config.serverUrl}/api/demo/html/`, // Endpoint name kept for compatibility
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ domain, force_refresh: forceRefresh }),
        }
      );

      if (!htmlResponse.ok) {
        const errorData = await htmlResponse.json();
        console.error("Screenshot fetch failed:", errorData);
        throw new Error(errorData.error || "Failed to fetch website screenshot");
      }

      const responseData = await htmlResponse.json();
      const screenshotUrl = responseData.screenshot_url || responseData.html; // Fallback supports old behavior if any
      setFromCache(responseData.from_cache || false);

      console.log("Screenshot URL received:", screenshotUrl, "from_cache:", responseData.from_cache);

      // Validate URL
      if (!screenshotUrl) {
        console.error("Empty result received from server");
        throw new Error("Server returned empty result");
      }

      // Construct HTML with the screenshot
      // specific logic if it's a URL (screenshot) vs HTML (fallback)
      let html = "";
      if (screenshotUrl.startsWith("http")) {
          html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; overflow-x: hidden; background: #f0f0f0; }
    img { width: 100%; height: auto; display: block; }
  </style>
</head>
<body>
  <img src="${screenshotUrl}" alt="Website Preview" />
</body>
</html>`;
      } else {
          // Fallback to old behavior if backend returns HTML (shouldn't happen with new backend code)
          html = screenshotUrl;
      }

      // Use the hosted widget script directly
      // This ensures the demo matches exactly what the user gets
      // We pass the effective webhook URL via data attribute which we added support for in widget.js
      let scriptAttributes = `src="${config.serverUrl}/api/widget.js" data-domain="${domain}" defer`;
      if (effectiveWebhookUrl) {
          scriptAttributes += ` data-webhook-url="${effectiveWebhookUrl}"`;
      }
      const widgetScript = `<script ${scriptAttributes}></script>`;

      // Inject the widget script into the HTML
      const modifiedHtml = injectWidgetIntoHtml(html, widgetScript);

      // Store the HTML content and end loading state
      console.log("HTML prepared, setting content state");
      setHtmlContent(modifiedHtml);
      setLoading(false);
      setRefreshingScreenshot(false);
      setRetryCount(0); // Reset retry count on success
      
      if (forceRefresh) {
        addToast({
          title: "Screenshot Updated",
          description: "The preview screenshot has been refreshed.",
          color: "success",
        });
      }
    } catch (err: any) {
      console.error("Error loading demo:", err);
      
      // Retry logic for empty HTML or network errors
      const shouldRetry = retryCount < maxRetries && (
        err.message?.includes("empty") || 
        err.message?.includes("insufficient") ||
        err.message?.includes("network") ||
        err.message?.includes("timeout")
      );
      
      if (shouldRetry) {
        console.log(`Retrying... Attempt ${retryCount + 1} of ${maxRetries}`);
        setRetryCount(retryCount + 1);
        
        // Wait a bit before retrying
        setTimeout(() => {
          loadDemoContent();
        }, 1000 * (retryCount + 1)); // Exponential backoff
        
        return;
      }
      
      setError(err.message || "Failed to load demo");
      addToast({
        title: "Error",
        description: err.message || "Failed to load demo",
        color: "danger",
      });
      setLoading(false);
      setRetryCount(0); // Reset retry count
    }
  };

  const injectWidgetIntoHtml = (html: string, widgetScript: string): string => {
    // Ensure we have valid HTML
    if (!html || html.trim().length === 0) {
      console.error("Attempting to inject widget into empty HTML");
      return html;
    }

    // Try to inject before closing body tag
    if (html.includes("</body>")) {
      return html.replace("</body>", `${widgetScript}\n</body>`);
    }
    
    // Try to inject before closing html tag
    if (html.includes("</html>")) {
      return html.replace("</html>", `${widgetScript}\n</html>`);
    }
    
    // If no closing tags, wrap the HTML properly
    console.warn("No proper HTML structure found, wrapping content");
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
  ${html}
  ${widgetScript}
</body>
</html>`;
  };

  const handleBackToProject = () => {
    // Try to go back to project page, but if not authenticated, just go to home
    try {
      router.push(`/project/${domain}`);
    } catch (error) {
      router.push("/");
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Demo</h1>
          <p className="text-gray-700 mb-6">{error}</p>
          <Button color="danger" onClick={handleBackToProject}>
            Back to Project
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-white fixed inset-0">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0 z-10">
        <div className="flex items-center gap-4">
          <Button
            variant="light"
            onClick={handleBackToProject}
            size="sm"
            startContent={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            }
          >
            Back to Project
          </Button>
          <div className="border-l border-gray-300 h-8" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Live Demo</h1>
            <p className="text-xs text-gray-500">{domain}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {fromCache && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-blue-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
              </svg>
              <span className="text-xs font-medium text-blue-700">Cached Preview</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-green-700">Live Preview</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg" title="Some website features may not work in demo mode due to browser security policies">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-amber-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <span className="text-xs font-medium text-amber-700">Demo Mode</span>
          </div>
          {isAuthenticated && fromCache && (
            <Tooltip content="Regenerate the preview screenshot (this may take a few seconds)">
              <Button 
                color="secondary" 
                variant="flat" 
                size="sm" 
                onClick={() => loadDemoContent(true)} 
                isDisabled={loading || refreshingScreenshot}
                isLoading={refreshingScreenshot}
                startContent={!refreshingScreenshot && (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                  </svg>
                )}
              >
                Update Screenshot
              </Button>
            </Tooltip>
          )}
          <Button color="primary" variant="flat" size="sm" onClick={() => loadDemoContent(false)} isDisabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Demo Content - Full Width and Height */}
      <div className="flex-1 w-full overflow-hidden">
        <DemoPreview 
          htmlContent={htmlContent} 
          loading={loading} 
          error={error} 
        />
      </div>
    </div>
  );
}
