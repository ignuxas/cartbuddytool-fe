"use client";

import { Button } from "@heroui/button";
import { Switch } from "@heroui/switch";
import { Input } from "@heroui/input";

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

  return (
    <div className="w-full flex flex-col gap-4 p-4 border rounded-lg bg-content1 shadow-sm">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center w-full xl:w-auto">
          {/* AI Toggle */}
          <div className="flex items-center gap-3 p-2 bg-default-100 rounded-lg border border-default-200 w-full md:w-auto">
            <Switch
              disabled={loading || retryLoading !== null}
              isSelected={useAI}
              size="sm"
              onValueChange={setUseAI}
            >
              <span className="text-sm font-medium">Use AI</span>
            </Switch>
            <div className="text-xs text-default-500 hidden sm:block">
              {useAI ? (
                <span className="text-warning">⚠️ Slower (~4s/page)</span>
              ) : (
                <span className="text-success">✓ Fast (~0.1s/page)</span>
              )}
            </div>
          </div>

          {/* Settings */}
          <div className="flex gap-2 w-full md:w-auto">
            <Input
              className="max-w-[80px]"
              isDisabled={loading || retryLoading !== null}
              label="Retries"
              min={0}
              size="sm"
              type="number"
              value={retryCount.toString()}
              onValueChange={(v) => setRetryCount(parseInt(v) || 0)}
            />
            <Input
              className="max-w-[80px]"
              isDisabled={loading || retryLoading !== null}
              label="Delay (s)"
              min={0}
              size="sm"
              step={0.1}
              type="number"
              value={retryDelay.toString()}
              onValueChange={(v) => setRetryDelay(parseFloat(v) || 0)}
            />
            {setConcurrency && concurrency !== undefined && (
              <Input
                className="max-w-[80px]"
                isDisabled={loading || retryLoading !== null}
                label="Workers"
                max={20}
                min={1}
                size="sm"
                title="Threads/Concurrency"
                type="number"
                value={concurrency.toString()}
                onValueChange={(v) => setConcurrency(parseInt(v) || 1)}
              />
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 w-full xl:w-auto flex-wrap justify-end">
          {retryLoading === "scraping" && handleStopScraping && (
            <Button
              color="danger"
              disabled={loading}
              size="sm"
              variant="solid"
              onPress={handleStopScraping}
            >
              Stop Scraping
            </Button>
          )}
          <Button
            color="warning"
            disabled={loading || retryLoading !== null}
            size="sm"
            variant="flat"
            onPress={handleOpenRetryModal}
          >
            {retryLoading === "scraping" ? "Retrying..." : "Retry Full Site"}
          </Button>
          {handleSmartRescrapeImages && (
            <Button
              color="secondary"
              disabled={loading || retryLoading !== null}
              size="sm"
              variant="flat"
              onPress={() => handleSmartRescrapeImages(false)}
            >
              {retryLoading === "smart-images" ? "Updating..." : "Smart Update"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
