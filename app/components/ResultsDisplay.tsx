"use client";

import React from "react";
import {
  getKeyValue,
  SortDescriptor,
} from "@heroui/table";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";
import { Button } from "@heroui/button";
import { TrashIcon } from "./TrashIcon";
import { VerticalDotsIcon } from "./VerticalDotsIcon";
import { Textarea } from "@heroui/input";
import { Input } from "@heroui/input";
import { Switch } from "@heroui/switch";
import { Checkbox } from "@heroui/checkbox";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { addToast } from "@heroui/toast";
import { config } from "@/lib/config";
import { useRouter } from "next/navigation";
import ScrapedPagesTable, { ScrapedDataItem as TableScrapedDataItem } from "./ScrapedPagesTable";

interface ScrapedDataItem {
  url: string;
  title: string;
  content: string;
  textLength: number;
  selected: boolean;
  main?: boolean;
  image?: string;
}

interface WorkflowResult {
  workflow_id: string;
  workflow_url: string;
  webhook_url?: string;
}

interface ResultsDisplayProps {
  sheetId: string | null;
  prompt: string;
  workflowResult: WorkflowResult | null;
  webhookSecret?: string | null;
  scrapedData: ScrapedDataItem[];
  url: string;
  loading: boolean;
  retryLoading: string | null;
  handleRegeneratePrompt: () => void;
  handleCreateWorkflow: () => void;
  handleForceRegenerateWorkflow?: () => void;
  handleSavePromptToWorkflow?: () => void;
  handleDeleteItem: (url: string, domain: string) => void;
  handleToggleMain?: (url: string, currentMain: boolean) => void;
  handleToggleSelect: (url: string) => void;
  handleRescrapeItem?: (url: string, domain: string, usePlaywright?: boolean) => void;
  setPrompt: (prompt: string) => void;
  showAddMorePages: boolean;
  onShowAddMorePages: () => void;
  additionalUrls: { url: string; selected: boolean }[];
  onToggleAdditionalUrl: (url: string) => void;
  onAddAdditionalUrl: (url: string) => void;
  onScrapeAdditionalPages: (usePlaywright?: boolean) => void;
  onCancelAddMorePages: () => void;
  handleDeleteSelected: () => void;
  handleRescrapeSelected?: (usePlaywright: boolean) => void;
  numSelected: number;
  handleUpdateImage?: (url: string, newImageUrl: string) => Promise<void>;
  promptModified?: boolean;
  lastSmartUpdate?: string | null;
}

const EditIcon = (props: any) => (
  <svg
    aria-hidden="true"
    fill="none"
    focusable="false"
    height="1em"
    role="presentation"
    viewBox="0 0 20 20"
    width="1em"
    {...props}
  >
    <path
      d="M11.05 3.00002L4.20835 10.2417C3.95002 10.5167 3.70002 11.0584 3.65002 11.4334L3.34169 14.1334C3.23335 15.1084 3.93335 15.775 4.90002 15.6084L7.58335 15.15C7.95835 15.0834 8.48335 14.8084 8.74168 14.525L15.5834 7.28335C16.7667 6.03335 17.3 4.60835 15.4583 2.86668C13.625 1.14168 12.2334 1.75002 11.05 3.00002Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeMiterlimit={10}
      strokeWidth={1.5}
    />
    <path
      d="M9.90833 4.20831C10.2667 6.50831 12.1333 8.26665 14.45 8.49998"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeMiterlimit={10}
      strokeWidth={1.5}
    />
    <path
      d="M2.5 18.3333H17.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeMiterlimit={10}
      strokeWidth={1.5}
    />
  </svg>
);

const columns = [
  { key: "select", label: "Select" },
  { key: "main", label: "Main Page" },
  { key: "url", label: "URL" },
  { key: "title", label: "Title" },
  { key: "image", label: "Image" },
  { key: "textLength", label: "Text Length" },
  { key: "actions", label: "Actions" },
];

// Enhanced error logging for component
const logComponentError = (context: string, error: any, additionalData?: any) => {
  console.error(`[ResultsDisplay:${context}] Error:`, {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    additionalData
  });
};

export default function ResultsDisplay({
  scrapedData,
  prompt,
  workflowResult,
  webhookSecret,
  handleRegeneratePrompt,
  handleCreateWorkflow,
  handleForceRegenerateWorkflow,
  handleSavePromptToWorkflow,
  handleDeleteItem,
  handleToggleMain,
  handleRescrapeItem,
  retryLoading,
  setPrompt,
  url,
  showAddMorePages,
  onShowAddMorePages,
  additionalUrls,
  onToggleAdditionalUrl,
  onAddAdditionalUrl,
  onScrapeAdditionalPages,
  onCancelAddMorePages,
  handleToggleSelect,
  handleDeleteSelected,
  handleRescrapeSelected,
  numSelected,
  handleUpdateImage,
  promptModified,
  lastSmartUpdate
}: ResultsDisplayProps) {

  const [newAdditionalUrl, setNewAdditionalUrl] = React.useState("");
  const [usePlaywrightForAdditional, setUsePlaywrightForAdditional] = React.useState(false);
  const [showSecret, setShowSecret] = React.useState(false);
  const [embedCodeWithSettings, setEmbedCodeWithSettings] = React.useState<string>("");
  const router = useRouter();


  // Load embed code with widget settings when workflow result is available
  React.useEffect(() => {
    const loadEmbedCode = async () => {
      if (!workflowResult?.webhook_url) {
        setEmbedCodeWithSettings("");
        return;
      }

      const siteName = (() => {
        try {
          return new URL(url).hostname;
        } catch {
          return 'Website';
        }
      })();

      // Generate the simple embed code
      // The script will fetch settings and webhook URL automatically based on the domain
      const code = `<script src="${config.serverUrl}/api/widget.js" data-domain="${siteName}" defer></script>`;

      setEmbedCodeWithSettings(code);
    };

    loadEmbedCode();
  }, [workflowResult, url]);

  const handleAddAdditionalUrl = () => {
    try {
      if (!newAdditionalUrl.trim()) {
        return;
      }

      // Validate URL format
      try {
        new URL(newAdditionalUrl);
      } catch {
        console.error("Invalid URL format:", newAdditionalUrl);
        addToast({
          title: "Error",
          description: "Invalid URL format.",
          color: "danger",
        });
        return;
      }

      onAddAdditionalUrl(newAdditionalUrl);
      setNewAdditionalUrl("");
    } catch (error: any) {
      logComponentError("handleAddAdditionalUrl", error, { newAdditionalUrl });
      addToast({
        title: "Error",
        description: "Failed to add the URL.",
        color: "danger",
      });
    }
  };

  const handleCopyEmbedCode = async () => {
    try {
      if (!workflowResult?.webhook_url) {
        throw new Error("No webhook URL available");
      }

      const siteName = (() => {
        try {
          return new URL(url).hostname;
        } catch {
          return 'Your Website';
        }
      })();

      // Generate the simple embed code
      const embedCode = `<script src="${config.serverUrl}/api/widget.js" data-domain="${siteName}" defer></script>`;
      
      await navigator.clipboard.writeText(embedCode);
      addToast({
        title: "Success",
        description: "Copied to clipboard!",
        color: "success",
      });
    } catch (error: any) {
      logComponentError("copyEmbedCode", error, { workflowResult });
      addToast({
        title: "Error",
        description: "Failed to copy to clipboard.",
        color: "danger",
      });
    }
  };

  const handleTestChat = () => {
    try {
      if (!workflowResult?.webhook_url) {
        throw new Error("No webhook URL available");
      }
      window.open(workflowResult.webhook_url, '_blank');
    } catch (error: any) {
      logComponentError("testChat", error, { workflowResult });
      console.error("Failed to open chat:", error.message);
      addToast({
        title: "Error",
        description: "Failed to open chat.",
        color: "danger",
      });
    }
  };

  const handleViewWorkflow = () => {
    try {
      if (!workflowResult?.workflow_url) {
        throw new Error("No workflow URL available");
      }
      window.open(workflowResult.workflow_url, '_blank');
    } catch (error: any) {
      logComponentError("viewWorkflow", error, { workflowResult });
      console.error("Failed to open workflow:", error.message);
      addToast({
        title: "Error",
        description: "Failed to open workflow.",
        color: "danger",
      });
    }
  };

  const handleOpenDemo = () => {
    try {
      if (!workflowResult?.webhook_url) {
        throw new Error("No webhook URL available");
      }
      const domain = new URL(url).hostname;
      const demoUrl = `/demo?domain=${encodeURIComponent(domain)}&webhook=${encodeURIComponent(workflowResult.webhook_url)}`;
      router.push(demoUrl);
    } catch (error: any) {
      logComponentError("openDemo", error, { workflowResult, url });
      console.error("Failed to open demo:", error.message);
      addToast({
        title: "Error",
        description: "Failed to open demo.",
        color: "danger",
      });
    }
  };

  const handleCopyDemoLink = () => {
    try {
      if (!workflowResult?.webhook_url) {
        throw new Error("No webhook URL available");
      }
      const domain = new URL(url).hostname;
      const baseUrl = window.location.origin;
      const demoUrl = `${baseUrl}/demo?domain=${encodeURIComponent(domain)}&webhook=${encodeURIComponent(workflowResult.webhook_url)}`;
      
      navigator.clipboard.writeText(demoUrl);
      addToast({
        title: "Success",
        description: "Demo link copied to clipboard! Share it with your clients.",
        color: "success",
      });
    } catch (error: any) {
      logComponentError("copyDemoLink", error, { workflowResult, url });
      console.error("Failed to copy demo link:", error.message);
      addToast({
        title: "Error",
        description: "Failed to copy demo link.",
        color: "danger",
      });
    }
  };

  if (scrapedData.length === 0 && !prompt && !workflowResult) {
    return null;
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {scrapedData.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <div>
              <h3 className="text-xl font-bold">
                Scraped Pages ({scrapedData.length})
              </h3>
              {lastSmartUpdate && (
                <p className="text-xs text-default-500">
                  Last Smart Update: {new Date(lastSmartUpdate).toLocaleString()}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {numSelected > 0 && (
                <>
                   {handleRescrapeSelected && (
                     <Dropdown>
                       <DropdownTrigger>
                         <Button
                           size="sm"
                           color="primary"
                           variant="flat"
                           disabled={retryLoading !== null}
                         >
                           {`Rescrape Selected (${numSelected})`}
                         </Button>
                       </DropdownTrigger>
                       <DropdownMenu aria-label="Rescrape options">
                         <DropdownItem 
                           key="rescrape-standard" 
                           onPress={() => handleRescrapeSelected(false)}
                         >
                           Rescrape (Standard)
                         </DropdownItem>
                         <DropdownItem 
                           key="rescrape-playwright"
                           onPress={() => handleRescrapeSelected(true)}
                         >
                           Rescrape (Playwright)
                         </DropdownItem>
                       </DropdownMenu>
                     </Dropdown>
                   )}
                    <Button
                      size="sm"
                      color="danger"
                      variant="solid"
                      onPress={handleDeleteSelected}
                      disabled={retryLoading !== null}
                    >
                      {`Delete Selected (${numSelected})`}
                    </Button>
                </>
              )}
              <Button
                size="sm"
                variant="bordered"
                onClick={onShowAddMorePages}
                isLoading={retryLoading === "additional"}
                disabled={!!retryLoading || showAddMorePages}
              >
                Add More Pages
              </Button>
            </div>
          </div>

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
                      try {
                        additionalUrls.forEach((item) => {
                          if (!item.selected) onToggleAdditionalUrl(item.url);
                        });
                      } catch (error: any) {
                        logComponentError("selectAll", error);
                        addToast({ title: "Error", description: "Failed to select all.", color: "danger" });
                      }
                    }}
                  >
                    Select All
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      try {
                        additionalUrls.forEach((item) => {
                          if (item.selected) onToggleAdditionalUrl(item.url);
                        });
                      } catch (error: any) {
                        logComponentError("deselectAll", error);
                        addToast({ title: "Error", description: "Failed to deselect all.", color: "danger" });
                      }
                    }}
                  >
                    Deselect All
                  </Button>
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-md p-2 flex flex-col gap-2 mb-2">
                  {additionalUrls.length > 0 ? (
                    additionalUrls.map((item, index) => (
                      <Checkbox
                        key={`${item.url}-${index}`} // Use index as fallback for unique keys
                        isSelected={item.selected}
                        onValueChange={() => {
                          try {
                            onToggleAdditionalUrl(item.url);
                          } catch (error: any) {
                            logComponentError("toggleAdditionalUrl", error, { url: item.url });
                            addToast({ title: "Error", description: "Failed to toggle selection.", color: "danger" });
                          }
                        }}
                        size="sm"
                      >
                        <span className="text-sm truncate" title={item.url}>{item.url}</span>
                      </Checkbox>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">
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
                    isInvalid={newAdditionalUrl.trim() !== "" && (() => {
                      try {
                        new URL(newAdditionalUrl);
                        return false;
                      } catch {
                        return true;
                      }
                    })()}
                    errorMessage={newAdditionalUrl.trim() !== "" && (() => {
                      try {
                        new URL(newAdditionalUrl);
                        return "";
                      } catch {
                        return "Please enter a valid URL";
                      }
                    })()}
                  />
                  <Button 
                    onClick={handleAddAdditionalUrl}
                    disabled={newAdditionalUrl.trim() === "" || (() => {
                      try {
                        new URL(newAdditionalUrl);
                        return false;
                      } catch {
                        return true;
                      }
                    })()}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 px-1">
                    <Switch
                        isSelected={usePlaywrightForAdditional}
                        onValueChange={setUsePlaywrightForAdditional}
                        size="sm"
                    >
                        <span className="text-sm">Use Playwright</span>
                    </Switch>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      color="primary"
                      onClick={() => onScrapeAdditionalPages(usePlaywrightForAdditional)}
                      isLoading={retryLoading === "additional"}
                      disabled={additionalUrls.filter((u) => u.selected).length === 0}
                    >
                      Scrape{" "}
                      {additionalUrls.filter((u) => u.selected).length} Selected Pages
                    </Button>
                    <Button
                      variant="bordered"
                      onClick={onCancelAddMorePages}
                      disabled={retryLoading === "additional"}
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
            // We use a custom selection change handler to interface with parent's single-toggle method
            onSelectionChange={(urls, isSelected) => {
                urls.forEach(url => {
                   // Only toggle if state differs (assuming handleToggleSelect toggles boolean)
                   const item = scrapedData.find(i => i.url === url);
                   if (item && item.selected !== isSelected) {
                       handleToggleSelect(url);
                   }
                });
            }}
            onDelete={(deletedUrl) => {
               try {
                   // Extract hostname as done in previous implementation
                    const domain = new URL(url).hostname;
                    handleDeleteItem(deletedUrl, domain);
               } catch (e: any) {
                    console.error("Delete error", e);
                    addToast({ title: "Error", description: "Failed to delete item", color: "danger" });
               }
            }}
            onRescrape={handleRescrapeItem ? async (rescrapeUrl) => {
                try {
                    const domain = new URL(url).hostname;
                    await handleRescrapeItem(rescrapeUrl, domain);
                } catch (e: any) {
                     console.error("Rescrape error", e);
                     const message = "Failed to re-scrape item.";
                     addToast({ title: "Error", description: message, color: "danger" });
                }
            } : undefined}
            onUpdateImage={handleUpdateImage}
            onToggleMain={handleToggleMain}
          />

        </div>
      )}

      {prompt && (
        <div>
          {/* Prompt display removed as per request. Prompt is still maintained in state for workflow operations. */}
        </div>
      )}

      {/* Show workflow creation section when no workflow exists but data is available */}
      {!workflowResult && scrapedData.length > 0 && (
        <Card className="mb-4 border-warning/50 bg-warning/10">
          <CardBody>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⚠️</span>
                <h3 className="text-xl font-bold">No AI Workflow Found</h3>
              </div>
              <p className="text-default-600">
                Your website data has been scraped, but no n8n AI workflow has been created yet. 
                Click the button below to generate a workflow that powers your AI chatbot.
              </p>
              <div className="flex gap-2">
                <Button
                  color="primary"
                  variant="solid"
                  size="lg"
                  onClick={() => {
                    try {
                      handleCreateWorkflow();
                    } catch (error: any) {
                      logComponentError("createWorkflow", error);
                      addToast({ title: "Error", description: "Failed to create workflow.", color: "danger" });
                    }
                  }}
                  isLoading={retryLoading === "workflow"}
                  disabled={!!retryLoading}
                  startContent={
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  }
                >
                  🚀 Create AI Workflow
                </Button>
                {handleForceRegenerateWorkflow && (
                  <Button
                    color="warning"
                    variant="bordered"
                    size="lg"
                    onClick={() => {
                      try {
                        handleForceRegenerateWorkflow();
                      } catch (error: any) {
                        logComponentError("forceRegenerateWorkflow", error);
                        addToast({ title: "Error", description: "Failed to regenerate workflow.", color: "danger" });
                      }
                    }}
                    isLoading={retryLoading === "workflow"}
                    disabled={!!retryLoading}
                  >
                    🔄 Force Regenerate Workflow
                  </Button>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {workflowResult && (
        <div>
          <h3 className="text-xl font-bold mb-4">
            🎉 AI Workflow Created Successfully!
          </h3>

          <Card className="mb-4">
            <CardBody>
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold mb-2">Workflow Details</h4>
                    <div className="flex gap-2">
                      <p className="text-lg text-gray-600 mb-2">Workflow ID:</p>
                      <Chip 
                        color="primary" 
                        variant="flat" 
                        className="font-mono"
                        size="lg"
                      >
                        {workflowResult.workflow_id}
                      </Chip>
                    <Button
                      size="sm"
                      color="primary"
                      variant="ghost"
                      onClick={handleViewWorkflow}
                      className="h-8"
                    >
                      View & Manage Workflow →
                    </Button>
                    {handleForceRegenerateWorkflow && (
                      <Button
                        size="sm"
                        color="warning"
                        variant="bordered"
                        onClick={() => {
                          try {
                            handleForceRegenerateWorkflow();
                          } catch (error: any) {
                            logComponentError("forceRegenerateWorkflow", error);
                            addToast({ title: "Error", description: "Failed to regenerate workflow.", color: "danger" });
                          }
                        }}
                        isLoading={retryLoading === "workflow"}
                        disabled={!!retryLoading}
                      >
                        🔄 Force Regenerate Workflow
                      </Button>
                    )}
                  </div>

                  {webhookSecret && (
                  <div className="mt-4 p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                      <h4 className="text-sm font-semibold text-yellow-800 mb-2">🔒 Webhook Security (Verification Secret)</h4>
                      <p className="text-xs text-yellow-700 mb-2">
                          Your workflow now automatically verifies this secret to prevent unauthorized usage. The "Code" node in the generated workflow checks that the <code>X-Webhook-Secret</code> header matches this value. If you modify the workflow, ensure you keep this check.
                      </p>
                      <div className="flex items-center gap-2">
                          <code className="bg-white px-2 py-1 rounded border text-xs flex-1 break-all font-mono select-all text-black">
                              {showSecret ? webhookSecret : "•".repeat(webhookSecret ? webhookSecret.length : 12)}
                          </code>
                          <Button 
                              size="sm" 
                              variant="flat" 
                              onClick={() => setShowSecret(!showSecret)}
                          >
                              {showSecret ? "Hide" : "Show"}
                          </Button>
                          <Button 
                              size="sm" 
                              variant="flat" 
                              onClick={() => {navigator.clipboard.writeText(webhookSecret || ""); addToast({title: "Copied!", color: "success"})}}
                          >
                              Copy
                          </Button>
                      </div>
                  </div>
                  )}

                </div>

                {workflowResult.webhook_url && (
                  <div>
                    <h4 className="text-lg font-semibold mb-2">💬 Live Chat Widget</h4>
                    <div className="bg-green-800 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-green-400 font-medium">Chat widget is now live on this page!</span>
                      </div>
                      <p className="text-sm text-green-400">
                        Look for the chat icon in the bottom-right corner to test your AI assistant. 
                        This is exactly how it will appear on your website.
                      </p>
                    </div>

                    {/* Demo Button */}
                    <div className="mb-4">
                      <Button
                        color="success"
                        variant="shadow"
                        size="lg"
                        onClick={handleOpenDemo}
                        className="w-full font-semibold mb-2"
                        startContent={
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="w-6 h-6"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                          </svg>
                        }
                      >
                        🚀 View Live Demo on Your Website
                      </Button>
                      <Button
                        color="primary"
                        variant="bordered"
                        size="md"
                        onClick={handleCopyDemoLink}
                        className="w-full font-medium"
                        startContent={
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="w-5 h-5"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                          </svg>
                        }
                      >
                        📋 Copy Demo Link (Share with Clients)
                      </Button>
                      <p className="text-xs text-gray-500 text-center mt-2">
                        The demo link works without login - perfect for client presentations!
                      </p>
                    </div>

                    <h4 className="text-lg font-semibold mb-2">📋 Embed Code</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Copy and paste this code into your website to add the AI chat interface:
                    </p>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm font-mono overflow-x-auto">
                      <pre>{embedCodeWithSettings || 'Loading embed code...'}</pre>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="bordered"
                        onClick={handleCopyEmbedCode}
                        disabled={!workflowResult.webhook_url}
                      >
                        📋 Copy Full Embed Code
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

    </div>
  );
}