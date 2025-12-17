"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { config } from "@/lib/config";
import { addToast } from "@heroui/toast";
import { Button } from "@heroui/button";
import { getChatWidgetScript } from "@/app/utils/chatWidgetGenerator";
import DemoPreview from "./DemoPreview";

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

  const loadDemoContent = async () => {
    try {
      setLoading(true);
      setError(null);
      setHtmlContent(""); // Clear previous content

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
        baseUrl: window.location.origin, // Use current origin to load static assets
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
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg" title="Some website features may not work in demo mode due to browser security policies">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-amber-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <span className="text-xs font-medium text-amber-700">Demo Mode</span>
          </div>
          <Button color="primary" variant="flat" size="sm" onClick={loadDemoContent} isDisabled={loading}>
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
