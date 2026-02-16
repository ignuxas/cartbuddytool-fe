"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { addToast } from "@heroui/toast";
import { Button } from "@heroui/button";
import { Tooltip } from "@heroui/tooltip";

import DemoPreview from "./DemoPreview";

import { useAuth } from "@/app/contexts/AuthContext";
import { config } from "@/lib/config";

export default function DemoPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, authKey: _authKey } = useAuth();
  const domain = searchParams.get("domain");
  const webhookUrl = searchParams.get("webhook");

  const [loading, setLoading] = useState(true);
  const [refreshingScreenshot, setRefreshingScreenshot] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [screenshotUrl, setScreenshotUrl] = useState<string>("");
  const [effectiveWebhookUrl, setEffectiveWebhookUrl] = useState<string>("");
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

      // Load widget settings (public endpoint, no auth required)
      const settingsResponse = await fetch(
        `${config.serverUrl}/api/widget/settings/?domain=${encodeURIComponent(domain!)}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!settingsResponse.ok) {
        throw new Error("Failed to load widget settings");
      }

      const settings = await settingsResponse.json();

      // Webhook Strategy:
      // 1. Prefer webhookUrl from URL param (if passed explicitly)
      // 2. Fallback to settings.webhook_url (from backend WidgetCustomization/migration)
      // 3. Fallback to standard backend chat endpoint construction
      let resolvedWebhookUrl = webhookUrl || "";

      if (!resolvedWebhookUrl) {
        if (settings.webhook_url && settings.webhook_url.length > 0) {
          resolvedWebhookUrl = settings.webhook_url;
        } else {
          resolvedWebhookUrl = `${config.serverUrl}/api/chat/`;
        }
      }

      setEffectiveWebhookUrl(resolvedWebhookUrl);

      // Fetch the website screenshot
      const htmlResponse = await fetch(`${config.serverUrl}/api/demo/html/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ domain, force_refresh: forceRefresh }),
      });

      if (!htmlResponse.ok) {
        const errorData = await htmlResponse.json();

        throw new Error(
          errorData.error || "Failed to fetch website screenshot",
        );
      }

      const responseData = await htmlResponse.json();
      const screenshot = responseData.screenshot_url || responseData.html;

      setFromCache(responseData.from_cache || false);

      if (!screenshot) {
        throw new Error("Server returned empty result");
      }

      setScreenshotUrl(screenshot);
      setLoading(false);
      setRefreshingScreenshot(false);
      setRetryCount(0);

      if (forceRefresh) {
        addToast({
          title: "Screenshot Updated",
          description: "The preview screenshot has been refreshed.",
          color: "success",
        });
      }
    } catch (err: any) {
      // Retry logic for empty HTML or network errors
      const shouldRetry =
        retryCount < maxRetries &&
        (err.message?.includes("empty") ||
          err.message?.includes("insufficient") ||
          err.message?.includes("network") ||
          err.message?.includes("timeout"));

      if (shouldRetry) {
        setRetryCount(retryCount + 1);
        setTimeout(
          () => {
            loadDemoContent();
          },
          1000 * (retryCount + 1),
        );

        return;
      }

      setError(err.message || "Failed to load demo");
      addToast({
        title: "Error",
        description: err.message || "Failed to load demo",
        color: "danger",
      });
      setLoading(false);
      setRetryCount(0);
    }
  };

  const handleBackToProject = () => {
    try {
      router.push(`/project/${domain}`);
    } catch (_error) {
      router.push("/");
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Error Loading Demo
          </h1>
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
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0 z-[99999]">
        <div className="flex items-center gap-4">
          <Button
            className="text-gray-700"
            size="sm"
            startContent={
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
            variant="bordered"
            onClick={handleBackToProject}
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
              <svg
                className="w-4 h-4 text-blue-600"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-xs font-medium text-blue-700">
                Cached Preview
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-green-700">
              Live Preview
            </span>
          </div>
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg"
            title="Some website features may not work in demo mode due to browser security policies"
          >
            <svg
              className="w-4 h-4 text-amber-600"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-xs font-medium text-amber-700">
              Demo Mode
            </span>
          </div>
          {isAuthenticated && fromCache && (
            <Tooltip content="Regenerate the preview screenshot (this may take a few seconds)">
              <Button
                color="secondary"
                isDisabled={loading || refreshingScreenshot}
                isLoading={refreshingScreenshot}
                size="sm"
                startContent={
                  !refreshingScreenshot && (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )
                }
                variant="flat"
                onClick={() => loadDemoContent(true)}
              >
                Update Screenshot
              </Button>
            </Tooltip>
          )}
          <Button
            color="primary"
            isDisabled={loading}
            size="sm"
            variant="flat"
            onClick={() => loadDemoContent(false)}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Demo Content - Full Width and Height */}
      <div className="flex-1 w-full overflow-auto">
        <DemoPreview
          error={error}
          loading={loading}
          screenshotUrl={screenshotUrl}
          widgetDomain={domain || ""}
          widgetScriptUrl={`${config.serverUrl}/api/widget.js`}
          widgetWebhookUrl={effectiveWebhookUrl}
        />
      </div>
    </div>
  );
}
