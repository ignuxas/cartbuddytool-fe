"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { config } from "@/lib/config";
import { addToast } from "@heroui/toast";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/spinner";
import { getChatWidgetScript } from "@/app/utils/chatWidgetGenerator";

interface WidgetSettings {
  primary_color: string;
  secondary_color: string;
  text_color: string;
  title: string;
  welcome_message: string;
  suggestions: string[];
  bubble_greeting_text: string;
  bubble_button_text: string;
  input_placeholder: string;
  footer_text: string;
  view_product_text: string;
}

export default function DemoPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const domain = searchParams.get("domain");
  const webhookUrl = searchParams.get("webhook");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [htmlContent, setHtmlContent] = useState<string>("");
  const maxRetries = 2;

  useEffect(() => {
    if (!domain || !webhookUrl) {
      setError("Missing required parameters: domain and webhook URL");
      setLoading(false);
      return;
    }

    loadDemoContent();
  }, [domain, webhookUrl]);

  // Write HTML to iframe once it's rendered and we have content
  useEffect(() => {
    if (htmlContent && iframeRef.current && !loading) {
      try {
        console.log("Iframe ref available, writing HTML to iframe");
        const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
        if (iframeDoc) {
          console.log("Writing HTML to iframe, length:", htmlContent.length);
          iframeDoc.open();
          iframeDoc.write(htmlContent);
          iframeDoc.close();
          console.log("HTML successfully written to iframe");
        } else {
          console.error("Could not access iframe document");
          setError("Unable to access iframe document. This may be due to browser security restrictions.");
        }
      } catch (err) {
        console.error("Error writing to iframe:", err);
        setError("Failed to write content to iframe. This may be due to browser security restrictions.");
      }
    }
  }, [htmlContent, loading]);

  const handleIframeLoad = () => {
    console.log("Iframe loaded successfully");
    setIframeLoaded(true);
  };

  const handleIframeError = () => {
    console.error("Iframe failed to load");
    setError("Failed to load website content in preview. This may be due to browser security restrictions or website policies.");
  };

  const loadDemoContent = async () => {
    try {
      setLoading(true);
      setError(null);
      setHtmlContent(""); // Clear previous content
      setIframeLoaded(false);

      console.log("Loading demo for domain:", domain);

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

      // Fetch the website HTML (public endpoint, no auth required)
      console.log("Fetching HTML from server for domain:", domain);
      const htmlResponse = await fetch(
        `${config.serverUrl}/api/demo/html/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ domain }),
        }
      );

      if (!htmlResponse.ok) {
        const errorData = await htmlResponse.json();
        console.error("HTML fetch failed:", errorData);
        throw new Error(errorData.error || "Failed to fetch website HTML");
      }

      const { html } = await htmlResponse.json();
      console.log("HTML received, length:", html?.length || 0);

      // Validate HTML content
      if (!html || html.trim().length === 0) {
        console.error("Empty HTML received from server");
        throw new Error("Server returned empty HTML content");
      }

      if (html.trim().length < 100) {
        console.error("HTML too short:", html.trim().length);
        throw new Error("Server returned insufficient HTML content");
      }

      // Generate the chat widget script with settings
      const widgetScript = getChatWidgetScript({
        webhookUrl: webhookUrl!,
        siteName: domain!,
        primaryColor: settings.primary_color,
        secondaryColor: settings.secondary_color,
        textColor: settings.text_color,
        title: settings.title,
        welcomeMessage: settings.welcome_message,
        suggestions: settings.suggestions,
        bubbleGreetingText: settings.bubble_greeting_text,
        bubbleButtonText: settings.bubble_button_text,
        inputPlaceholder: settings.input_placeholder,
        footerText: settings.footer_text,
        viewProductText: settings.view_product_text,
      });

      // Inject the widget script into the HTML
      const modifiedHtml = injectWidgetIntoHtml(html, widgetScript);

      // Store the HTML content and end loading state
      // The iframe will be written to in the useEffect below
      console.log("HTML prepared, setting content state");
      setHtmlContent(modifiedHtml);
      setLoading(false);
      setRetryCount(0); // Reset retry count on success
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
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-green-700">Live Preview</span>
          </div>
          <Button color="primary" variant="flat" size="sm" onClick={loadDemoContent} isDisabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Demo Content - Full Width and Height */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center w-full">
          <div className="text-center">
            <Spinner size="lg" color="primary" />
            <p className="mt-4 text-gray-600">Loading demo preview...</p>
            <p className="text-sm text-gray-500 mt-2">Fetching website and injecting chat widget</p>
            {retryCount > 0 && (
              <p className="text-xs text-orange-500 mt-2">Retry attempt {retryCount} of {maxRetries}...</p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 w-full overflow-hidden">
          <iframe
            ref={iframeRef}
            className="w-full h-full border-0"
            title="Website Demo"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
        </div>
      )}
    </div>
  );
}
