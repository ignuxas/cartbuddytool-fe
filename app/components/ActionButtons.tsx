"use client";

import { Button } from "@heroui/button";
import { Switch } from "@heroui/switch";
import { Input } from "@heroui/input";

import PlaywrightSwitch from "@/app/components/PlaywrightSwitch";

interface ActionButtonsProps {
  scrapedDataLength: number;
  errorMessage: string;
  url: string;
  handleRetryScraping: (force: boolean) => void;
  handleOpenRetryModal: () => void;
  handleSmartRescrapeImages?: (full?: boolean) => void;
  handleStopScraping?: () => void;
  loading: boolean;
  retryLoading: string | null;
  useAI: boolean;
  setUseAI: (value: boolean) => void;
  keepImages: boolean;
  setKeepImages: (value: boolean) => void;
  usePlaywright: boolean;
  setUsePlaywright: (value: boolean) => void;
  retryCount: number;
  setRetryCount: (value: number) => void;
  retryDelay: number;
  setRetryDelay: (value: number) => void;
  concurrency?: number;
  setConcurrency?: (value: number) => void;
}

export default function ActionButtons({
  scrapedDataLength,
  errorMessage,
  url,
  handleRetryScraping: _handleRetryScraping,
  handleOpenRetryModal,
  handleSmartRescrapeImages,
  handleStopScraping,
  loading,
  retryLoading,
  useAI,
  setUseAI,
  keepImages,
  setKeepImages,
  usePlaywright,
  setUsePlaywright,
  retryCount,
  setRetryCount,
  retryDelay,
  setRetryDelay,
  concurrency,
  setConcurrency,
}: ActionButtonsProps) {
  if (!((scrapedDataLength > 0 || errorMessage) && url)) {
    return null;
  }

  const isDisabled = loading || retryLoading !== null;

  return (
    <div className="w-full flex flex-col gap-5 p-5 border rounded-xl bg-content1 shadow-sm">
      {/* Settings Section */}
      <div>
        <h3 className="text-sm font-semibold text-default-700 uppercase tracking-wide mb-3">
          Settings
        </h3>
        <div className="flex flex-col gap-4">
          {/* Image & Scraping Toggles Row */}
          <div className="flex flex-col md:flex-row gap-4 items-start">
            {/* Keep Old Images Toggle */}
            <div className="flex flex-col gap-1 p-3 bg-default-100 rounded-lg border border-default-200 w-full md:w-auto">
              <Switch
                disabled={isDisabled}
                isSelected={keepImages}
                size="sm"
                onValueChange={setKeepImages}
              >
                <span className="text-sm font-medium">Keep Old Images</span>
              </Switch>
              <p className="text-xs text-default-400 ml-1">
                {keepImages
                  ? "Existing images are preserved — only text content is re-scraped."
                  : "Images will be re-extracted from each page during scraping."}
              </p>
            </div>

            {/* AI Image Selection Toggle — only visible when Keep Old Images is OFF */}
            {!keepImages && (
              <div className="flex flex-col gap-1 p-3 bg-default-100 rounded-lg border border-default-200 w-full md:w-auto">
                <div className="flex items-center gap-3">
                  <Switch
                    color="secondary"
                    disabled={isDisabled}
                    isSelected={useAI}
                    size="sm"
                    onValueChange={setUseAI}
                  >
                    <span className="text-sm font-medium">
                      AI Image Selection
                    </span>
                  </Switch>
                  <div className="text-xs text-default-500 hidden sm:block">
                    {useAI ? (
                      <span className="text-warning">⚠️ ~4s/page</span>
                    ) : (
                      <span className="text-success">✓ ~0.1s/page</span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-default-400 ml-1">
                  {useAI
                    ? "Gemini AI analyzes page images and picks the most relevant one. Slower but more accurate."
                    : "Uses heuristics (meta tags, CSS classes) to pick images. Fast but may be less accurate."}
                </p>
              </div>
            )}

            {/* Playwright Toggle */}
            <div className="flex flex-col gap-1 p-3 bg-default-100 rounded-lg border border-default-200 w-full md:w-auto">
              <PlaywrightSwitch
                disabled={isDisabled}
                isSelected={usePlaywright}
                size="sm"
                onValueChange={setUsePlaywright}
              />
              <p className="text-xs text-default-400 ml-1">
                {usePlaywright
                  ? "Uses a headless browser — handles JS-rendered content but slower."
                  : "Uses simple HTTP requests — fast but may miss dynamic content."}
              </p>
            </div>
          </div>

          {/* Retry Settings Row */}
          <div className="flex flex-col gap-1">
            <div className="flex gap-2 w-full md:w-auto">
              <Input
                className="max-w-[80px]"
                isDisabled={isDisabled}
                label="Retries"
                min={0}
                size="sm"
                title="How many times to retry a failed page before giving up"
                type="number"
                value={retryCount.toString()}
                onValueChange={(v) => setRetryCount(parseInt(v) || 0)}
              />
              <Input
                className="max-w-[80px]"
                isDisabled={isDisabled}
                label="Delay (s)"
                min={0}
                size="sm"
                step={0.1}
                title="Seconds between retries (doubles each attempt)"
                type="number"
                value={retryDelay.toString()}
                onValueChange={(v) => setRetryDelay(parseFloat(v) || 0)}
              />
              {setConcurrency && concurrency !== undefined && (
                <Input
                  className="max-w-[80px]"
                  isDisabled={isDisabled}
                  label="Workers"
                  max={20}
                  min={1}
                  size="sm"
                  title="Number of pages scraped simultaneously"
                  type="number"
                  value={concurrency.toString()}
                  onValueChange={(v) => setConcurrency(parseInt(v) || 1)}
                />
              )}
            </div>
            <p className="text-xs text-default-400 ml-1">
              Retry failed pages with exponential backoff.
            </p>
          </div>
        </div>
      </div>

      {/* Actions Section */}
      <div>
        <h3 className="text-sm font-semibold text-default-700 uppercase tracking-wide mb-3">
          Actions
        </h3>
        <div className="flex flex-col gap-3">
          <div className="flex gap-3 flex-wrap items-start">
            {/* Smart Update */}
            {handleSmartRescrapeImages && (
              <div className="flex flex-col gap-1">
                <Button
                  color="secondary"
                  disabled={isDisabled}
                  size="sm"
                  variant="flat"
                  onPress={() => handleSmartRescrapeImages(false)}
                >
                  {retryLoading === "smart-images"
                    ? "Updating..."
                    : "Smart Update"}
                </Button>
                <p className="text-xs text-default-400 max-w-[220px]">
                  Finds new pages, removes deleted ones, and re-scrapes pages
                  missing images or content.
                </p>
              </div>
            )}

            {/* Retry Full Site */}
            <div className="flex flex-col gap-1">
              <Button
                color="warning"
                disabled={isDisabled}
                size="sm"
                variant="flat"
                onPress={handleOpenRetryModal}
              >
                {retryLoading === "scraping"
                  ? "Retrying..."
                  : "Retry Full Site"}
              </Button>
              <p className="text-xs text-default-400 max-w-[220px]">
                Deletes all existing data and re-scrapes the entire site from
                scratch.
              </p>
            </div>

            {/* Stop Button */}
            {retryLoading === "scraping" && handleStopScraping && (
              <div className="flex flex-col gap-1">
                <Button
                  color="danger"
                  disabled={loading}
                  size="sm"
                  variant="solid"
                  onPress={handleStopScraping}
                >
                  Stop Scraping
                </Button>
                <p className="text-xs text-default-400 max-w-[220px]">
                  Cancel the current scraping job.
                </p>
              </div>
            )}
          </div>

          {/* How settings affect actions */}
          <div className="text-xs text-default-400 bg-default-50 rounded-lg p-3 border border-default-100">
            <p className="font-medium text-default-500 mb-1">
              How settings apply:
            </p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>
                <strong>All settings above</strong> apply to Retry Full Site and
                Re-scrape Selected (in the table below).
              </li>
              <li>
                <strong>Smart Update</strong> only re-scrapes pages missing
                images or content — it won&apos;t re-pick images on pages that
                already have one. To re-pick images, use Re-scrape Selected with
                &quot;Keep Old Images&quot; off.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
