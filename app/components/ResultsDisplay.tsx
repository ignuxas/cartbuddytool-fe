"use client";

import React from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  getKeyValue,
  SortDescriptor,
} from "@heroui/table";
import { Button } from "@heroui/button";
import { TrashIcon } from "./TrashIcon";
import { Textarea } from "@heroui/input";
import { Input } from "@heroui/input";
import { Checkbox } from "@heroui/checkbox";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";

interface ScrapedDataItem {
  url: string;
  title: string;
  content: string;
  textLength: number;
  selected: boolean;
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
  scrapedData: ScrapedDataItem[];
  url: string;
  loading: boolean;
  retryLoading: string | null;
  handleRegeneratePrompt: () => void;
  handleCreateWorkflow: () => void;
  handleForceRegenerateWorkflow?: () => void;
  handleDeleteItem: (url: string, domain: string) => void;
  handleToggleSelect: (url: string) => void;
  setPrompt: (prompt: string) => void;
  showAddMorePages: boolean;
  onShowAddMorePages: () => void;
  additionalUrls: { url: string; selected: boolean }[];
  onToggleAdditionalUrl: (url: string) => void;
  onAddAdditionalUrl: (url: string) => void;
  onScrapeAdditionalPages: () => void;
  onCancelAddMorePages: () => void;
  handleDeleteSelected: () => void;
  numSelected: number;
}

const columns = [
  { key: "select", label: "Select" },
  { key: "url", label: "URL" },
  { key: "title", label: "Title" },
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
  handleRegeneratePrompt,
  handleCreateWorkflow,
  handleForceRegenerateWorkflow,
  handleDeleteItem,
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
  numSelected,
}: ResultsDisplayProps) {
  const [sortDescriptor, setSortDescriptor] = React.useState<SortDescriptor>({
    column: "url",
    direction: "ascending",
  });
  const [newAdditionalUrl, setNewAdditionalUrl] = React.useState("");
  const [copyFeedback, setCopyFeedback] = React.useState<string>("");

  const sortedItems = React.useMemo(() => {
    try {
      // Remove duplicates based on URL before sorting
      const uniqueData = scrapedData.reduce((acc, item) => {
        if (!acc.find(existing => existing.url === item.url)) {
          acc.push(item);
        }
        return acc;
      }, [] as ScrapedDataItem[]);

      return [...uniqueData].sort((a, b) => {
        if (sortDescriptor.column === 'select') return 0; // Don't sort by select column
        const first = a[sortDescriptor.column as keyof Omit<ScrapedDataItem, 'selected'>];
        const second = b[sortDescriptor.column as keyof Omit<ScrapedDataItem, 'selected'>];
        let cmp =
          (parseInt(first as string) || first) <
          (parseInt(second as string) || second)
            ? -1
            : 1;

        if (sortDescriptor.direction === "descending") {
          cmp *= -1;
        }

        return cmp;
      });
    } catch (error: any) {
      logComponentError("sortedItems", error, { sortDescriptor, dataLength: scrapedData.length });
      return scrapedData; // Return unsorted data as fallback
    }
  }, [sortDescriptor, scrapedData]);

  const renderCell = React.useCallback(
    (item: ScrapedDataItem, columnKey: React.Key) => {
      try {
        const cellValue = getKeyValue(item, columnKey as keyof ScrapedDataItem);

        switch (columnKey) {
          case "select":
            return (
              <Checkbox
                isSelected={item.selected}
                onValueChange={() => handleToggleSelect(item.url)}
                aria-label={`Select row ${item.url}`}
              />
            );
          case "url":
            return (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline truncate"
                onClick={(e) => {
                  // Additional error handling for link clicks
                  try {
                    new URL(item.url); // Validate URL before opening
                  } catch {
                    e.preventDefault();
                    console.error("Invalid URL:", item.url);
                  }
                }}
              >
                {item.url}
              </a>
            );
          case "title":
            return <span className="truncate" title={item.title}>{item.title}</span>;
          case "actions":
            return (
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onPress={() => {
                  try {
                    const domain = new URL(url).hostname;
                    handleDeleteItem(item.url, domain);
                  } catch (error: any) {
                    logComponentError("deleteItem", error, { itemUrl: item.url, url });
                    console.error("Failed to delete item:", error.message);
                  }
                }}
                aria-label={`Delete item ${item.url}`}
              >
                <TrashIcon className="text-lg text-danger" />
              </Button>
            );
          default:
            return cellValue;
        }
      } catch (error: any) {
        logComponentError("renderCell", error, { item, columnKey });
        return <span className="text-red-500">Error rendering cell</span>;
      }
    },
    [handleDeleteItem, url, handleToggleSelect]
  );

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
        return;
      }

      onAddAdditionalUrl(newAdditionalUrl);
      setNewAdditionalUrl("");
    } catch (error: any) {
      logComponentError("handleAddAdditionalUrl", error, { newAdditionalUrl });
    }
  };

  const handleCopyEmbedCode = async () => {
    try {
      if (!workflowResult?.webhook_url) {
        throw new Error("No webhook URL available");
      }

      const embedCode = `<script src="https://cdn.jsdelivr.net/npm/n8n-embedded-chat-interface@latest/output/index.js"></script>
<n8n-embedded-chat-interface 
  label="${new URL(url).hostname} Assistant" 
  description="Get instant help with your questions" 
  hostname="${workflowResult.webhook_url}" 
  mode="n8n" 
  open-on-start="false">
</n8n-embedded-chat-interface>`;
      
      await navigator.clipboard.writeText(embedCode);
      setCopyFeedback("Copied to clipboard!");
      setTimeout(() => setCopyFeedback(""), 3000);
    } catch (error: any) {
      logComponentError("copyEmbedCode", error, { workflowResult });
      setCopyFeedback("Failed to copy to clipboard");
      setTimeout(() => setCopyFeedback(""), 3000);
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
            <h3 className="text-xl font-bold">
              Scraped Pages ({scrapedData.length})
            </h3>
            <div className="flex gap-2">
              {numSelected > 0 && (
                <Button
                  size="sm"
                  color="danger"
                  variant="solid"
                  onPress={handleDeleteSelected}
                  disabled={retryLoading !== null}
                >
                  {`Delete Selected (${numSelected})`}
                </Button>
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
                <div className="flex gap-2">
                  <Button
                    color="primary"
                    onClick={onScrapeAdditionalPages}
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
              </CardBody>
            </Card>
          )}

          <Table
            aria-label="Scraped data table"
            sortDescriptor={sortDescriptor}
            onSortChange={setSortDescriptor}
          >
            <TableHeader columns={columns}>
              {(column) => {
                if (column.key === "select") {
                  return (
                    <TableColumn key={column.key} allowsSorting={false}>
                      <Checkbox
                        isSelected={
                          scrapedData.length > 0 &&
                          scrapedData.every((item) => item.selected)
                        }
                        isIndeterminate={
                          scrapedData.length > 0 &&
                          !scrapedData.every((item) => item.selected) &&
                          scrapedData.some((item) => item.selected)
                        }
                        onValueChange={(isSelected) => {
                          scrapedData.forEach((item) => {
                            if (item.selected !== isSelected) {
                              handleToggleSelect(item.url);
                            }
                          });
                        }}
                        aria-label="Select all rows"
                      />
                    </TableColumn>
                  );
                }
                return (
                  <TableColumn
                    key={column.key}
                    allowsSorting={column.key !== "actions"}
                  >
                    {column.label}
                  </TableColumn>
                );
              }}
            </TableHeader>
            <TableBody
              items={sortedItems}
              emptyContent={"No pages scraped yet."}
            >
              {(item) => (
                <TableRow key={`${item.url}-${item.textLength}`}>
                  {(columnKey) => (
                    <TableCell>{renderCell(item, columnKey)}</TableCell>
                  )}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {prompt && (
        <div>
          <h3 className="text-xl font-bold">Generated Prompt</h3>
          <Textarea
            label="Editable Prompt"
            value={prompt}
            onValueChange={(value) => {
              try {
                setPrompt(value);
              } catch (error: any) {
                logComponentError("setPrompt", error, { promptLength: value.length });
              }
            }}
            minRows={10}
            maxRows={20}
            className="text-sm"
          />
          <div className="flex gap-2 mt-2">
            <Button
              onClick={() => {
                try {
                  handleRegeneratePrompt();
                } catch (error: any) {
                  logComponentError("regeneratePrompt", error);
                }
              }}
              isLoading={retryLoading === "prompt"}
              disabled={!!retryLoading}
            >
              Regenerate Prompt
            </Button>
            <Button
              color="secondary"
              onClick={() => {
                try {
                  if (!prompt.trim()) {
                    console.warn("Cannot create workflow with empty prompt");
                    return;
                  }
                  handleCreateWorkflow();
                } catch (error: any) {
                  logComponentError("createWorkflow", error);
                }
              }}
              isLoading={retryLoading === "workflow"}
              disabled={!!retryLoading || !prompt.trim()}
            >
              Create n8n Workflow
            </Button>
          </div>
        </div>
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

                    <h4 className="text-lg font-semibold mb-2">📋 Embed Code</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Copy and paste this code into your website to add the AI chat interface:
                    </p>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm font-mono overflow-x-auto">
                      <pre>{`<script src="https://cdn.jsdelivr.net/npm/n8n-embedded-chat-interface@latest/output/index.js"></script>
<n8n-embedded-chat-interface 
  label="${(() => {
    try {
      return new URL(url).hostname;
    } catch {
      return 'Website';
    }
  })()} Assistant" 
  description="Get instant help with your questions" 
  hostname="${workflowResult.webhook_url}" 
  mode="n8n" 
  open-on-start="false">
</n8n-embedded-chat-interface>`}</pre>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="bordered"
                        onClick={handleCopyEmbedCode}
                        disabled={!workflowResult.webhook_url}
                      >
                        📋 Copy Embed Code
                      </Button>
                      {copyFeedback && (
                        <Chip 
                          color={copyFeedback.includes("Failed") ? "danger" : "success"} 
                          size="sm"
                        >
                          {copyFeedback}
                        </Chip>
                      )}
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