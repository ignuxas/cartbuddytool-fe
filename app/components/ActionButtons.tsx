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
}

export default function ActionButtons({
  scrapedDataLength,
  errorMessage,
  url,
  handleRetryScraping,
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
}: ActionButtonsProps) {
  if (!((scrapedDataLength > 0 || errorMessage) && url)) {
    return null;
  }

  return (
    <div className="flex flex-col w-full max-w-4xl gap-4 items-center">
      {/* AI Toggle */}
      <div className="flex items-center gap-3 p-3 bg-default-100 rounded-lg border border-default-200">
        <Switch
          size="sm"
          isSelected={useAI}
          onValueChange={setUseAI}
          disabled={loading || retryLoading !== null}
        >
          <span className="text-sm font-medium">
            Use AI for Image Selection
          </span>
        </Switch>
        <div className="text-xs text-default-500 max-w-md">
          {useAI ? (
            <span className="text-warning">⚠️ AI enabled: Slower (~4s/page) but smarter image selection</span>
          ) : (
            <span className="text-success">✓ Fast mode: Rule-based image selection (~0.1s/page)</span>
          )}
        </div>
      </div>

      {/* Settings */}
      <div className="flex w-full gap-4 items-center justify-center">
        <Input
          type="number"
          label="Retries"
          size="sm"
          value={retryCount.toString()}
          onValueChange={(v) => setRetryCount(parseInt(v) || 0)}
          className="max-w-[100px]"
          min={0}
          isDisabled={loading || retryLoading !== null}
        />
        <Input
          type="number"
          label="Delay (s)"
          size="sm"
          value={retryDelay.toString()}
          onValueChange={(v) => setRetryDelay(parseFloat(v) || 0)}
          className="max-w-[100px]"
          step={0.1}
          min={0}
          isDisabled={loading || retryLoading !== null}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex w-full gap-2 justify-center flex-wrap">
        {retryLoading === 'scraping' && handleStopScraping && (
          <Button
            size="sm"
            color="danger"
            variant="solid"
            onPress={handleStopScraping}
            disabled={loading}
          >
            Stop Scraping
          </Button>
        )}
        <Button
          size="sm"
          color="warning"
          variant="flat"
          onPress={handleOpenRetryModal}
          disabled={loading || retryLoading !== null}
        >
          {retryLoading === 'scraping' ? "Retrying..." : "Retry Scraping"}
        </Button>
        {handleSmartRescrapeImages && (
          <>
            <Button
              size="sm"
              color="secondary"
              variant="flat"
              onPress={() => handleSmartRescrapeImages(false)}
              disabled={loading || retryLoading !== null}
            >
              {retryLoading === 'smart-images' ? "Updating..." : "Smart Update"}
            </Button>
            <Button
              size="sm"
              color="primary"
              variant="flat"
              onPress={() => handleSmartRescrapeImages(true)} 
              disabled={loading || retryLoading !== null}
            >
              {retryLoading === 'full-smart' ? "Updating..." : "Full Smart Update"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}