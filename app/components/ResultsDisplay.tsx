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
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { Button } from "@heroui/button";
import { TrashIcon } from "./TrashIcon";
import { Textarea } from "@heroui/input";
import { Input } from "@heroui/input";
import { Checkbox } from "@heroui/checkbox";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { addToast } from "@heroui/toast";
import { config } from "@/lib/config";
import { useRouter } from "next/navigation";

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
  scrapedData: ScrapedDataItem[];
  url: string;
  loading: boolean;
  retryLoading: string | null;
  handleRegeneratePrompt: () => void;
  handleCreateWorkflow: () => void;
  handleForceRegenerateWorkflow?: () => void;
  handleDeleteItem: (url: string, domain: string) => void;
  handleToggleSelect: (url: string) => void;
  handleRescrapeItem?: (url: string, domain: string) => void;
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
  handleUpdateImage?: (url: string, newImageUrl: string) => Promise<void>;
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
  handleRegeneratePrompt,
  handleCreateWorkflow,
  handleForceRegenerateWorkflow,
  handleDeleteItem,
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
  numSelected,
  handleUpdateImage,
}: ResultsDisplayProps) {
  const {isOpen, onOpen, onOpenChange} = useDisclosure();
  const [editingItem, setEditingItem] = React.useState<ScrapedDataItem | null>(null);
  const [newImageUrl, setNewImageUrl] = React.useState("");
  const [isUpdatingImage, setIsUpdatingImage] = React.useState(false);

  const openEditImageModal = (item: ScrapedDataItem) => {
    setEditingItem(item);
    setNewImageUrl(item.image || "");
    onOpen();
  };

  const handleSaveImage = async () => {
    if (!editingItem || !handleUpdateImage) return;
    
    setIsUpdatingImage(true);
    try {
      await handleUpdateImage(editingItem.url, newImageUrl);
      onOpenChange(); // Close modal
      addToast({
        title: "Success",
        description: "Image updated successfully",
        color: "success",
      });
    } catch (error: any) {
      addToast({
        title: "Error",
        description: error.message || "Failed to update image",
        color: "danger",
      });
    } finally {
      setIsUpdatingImage(false);
    }
  };

  const [sortDescriptor, setSortDescriptor] = React.useState<SortDescriptor>({
    column: "url",
    direction: "ascending",
  });
  const [newAdditionalUrl, setNewAdditionalUrl] = React.useState("");
  const [embedCodeWithSettings, setEmbedCodeWithSettings] = React.useState<string>("");
  const [page, setPage] = React.useState(1);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [rescrapingUrl, setRescrapingUrl] = React.useState<string | null>(null);
  const rowsPerPage = 20;
  const router = useRouter();

  const sortedItems = React.useMemo(() => {
    try {
      // Remove duplicates based on URL before sorting
      const uniqueData = scrapedData.reduce((acc, item) => {
        if (!acc.find(existing => existing.url === item.url)) {
          acc.push(item);
        }
        return acc;
      }, [] as ScrapedDataItem[]);

      // Filter by search query
      const filteredData = uniqueData.filter(item => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          item.url.toLowerCase().includes(query) ||
          item.title.toLowerCase().includes(query)
        );
      });

      return [...filteredData].sort((a, b) => {
        if (sortDescriptor.column === 'select') return 0; // Don't sort by select column
        
        // Handle the main column specifically
        if (sortDescriptor.column === 'main') {
          const aMain = a.main ? 1 : 0;
          const bMain = b.main ? 1 : 0;
          let cmp = aMain - bMain;
          if (sortDescriptor.direction === "descending") {
            cmp *= -1;
          }
          return cmp;
        }
        
        const first = a[sortDescriptor.column as keyof Omit<ScrapedDataItem, 'selected'>];
        const second = b[sortDescriptor.column as keyof Omit<ScrapedDataItem, 'selected'>];
        
        if (first === undefined || second === undefined) return 0;
        
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
      addToast({
        title: "Error",
        description: "An error occurred while sorting the data.",
        color: "danger",
      });
      return scrapedData; // Return unsorted data as fallback
    }
  }, [sortDescriptor, scrapedData, searchQuery]);

  // Paginated items - only render items for current page
  const paginatedItems = React.useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return sortedItems.slice(start, end);
  }, [sortedItems, page]);

  const totalPages = Math.ceil(sortedItems.length / rowsPerPage);

  // Reset to page 1 when data changes or sorting changes
  React.useEffect(() => {
    setPage(1);
  }, [scrapedData.length, sortDescriptor]);

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
          case "main":
            return (
              <Chip
                color={item.main ? "success" : "default"}
                variant="flat"
                size="sm"
              >
                {item.main ? "Yes" : "No"}
              </Chip>
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
                    const message = `Invalid URL: ${item.url}`;
                    console.error(message);
                    addToast({ title: "Error", description: message, color: "danger" });
                  }
                }}
              >
                {item.url}
              </a>
            );
          case "title":
            return <span className="truncate" title={item.title}>{item.title}</span>;
          case "image":
            return item.image ? (
              <img 
                src={item.image} 
                alt={item.title || "Page image"} 
                className="w-16 h-16 object-cover rounded"
                onError={(e) => {
                  // Hide broken images
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <span className="text-gray-400 text-sm">No image</span>
            );
          case "actions":
            return (
              <div className="flex gap-1">
                {handleUpdateImage && (
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    color="primary"
                    onPress={() => openEditImageModal(item)}
                    title="Edit Image"
                  >
                    <EditIcon />
                  </Button>
                )}
                {handleRescrapeItem && (
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    color="secondary"
                    isLoading={rescrapingUrl === item.url}
                    onPress={async () => {
                      try {
                        const domain = new URL(url).hostname;
                        setRescrapingUrl(item.url);
                        await handleRescrapeItem(item.url, domain);
                        setRescrapingUrl(null);
                      } catch (error: any) {
                        setRescrapingUrl(null);
                        const message = "Failed to re-scrape item.";
                        logComponentError("rescrapeItem", error, { itemUrl: item.url, url });
                        console.error(message, error.message);
                        addToast({ title: "Error", description: message, color: "danger" });
                      }
                    }}
                    aria-label={`Re-scrape item ${item.url}`}
                    title="Re-scrape this page"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </Button>
                )}
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  onPress={() => {
                    try {
                      const domain = new URL(url).hostname;
                      handleDeleteItem(item.url, domain);
                    } catch (error: any) {
                      const message = "Failed to delete item.";
                      logComponentError("deleteItem", error, { itemUrl: item.url, url });
                      console.error(message, error.message);
                      addToast({ title: "Error", description: message, color: "danger" });
                    }
                  }}
                  aria-label={`Delete item ${item.url}`}
                >
                  <TrashIcon className="text-lg text-danger" />
                </Button>
              </div>
            );
          default:
            return cellValue;
        }
      } catch (error: any) {
        logComponentError("renderCell", error, { item, columnKey });
        addToast({
          title: "Error",
          description: "An error occurred while rendering a cell.",
          color: "danger",
        });
        return <span className="text-red-500">Error</span>;
      }
    },
    [handleDeleteItem, handleRescrapeItem, url, handleToggleSelect, rescrapingUrl]
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

          {/* Search Bar */}
          <div className="mb-3">
            <Input
              type="text"
              placeholder="Search by URL or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              isClearable
              onClear={() => setSearchQuery("")}
              startContent={
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
            {searchQuery && (
              <p className="text-sm text-gray-500 mt-1">
                Showing {sortedItems.length} of {scrapedData.length} pages
              </p>
            )}
          </div>

          <div className="max-h-[600px] overflow-auto rounded-lg">
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
                          paginatedItems.length > 0 &&
                          paginatedItems.every((item) => item.selected)
                        }
                        isIndeterminate={
                          paginatedItems.length > 0 &&
                          !paginatedItems.every((item) => item.selected) &&
                          paginatedItems.some((item) => item.selected)
                        }
                        onValueChange={(isSelected) => {
                          paginatedItems.forEach((item) => {
                            if (item.selected !== isSelected) {
                              handleToggleSelect(item.url);
                            }
                          });
                        }}
                        aria-label="Select all rows on current page"
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
              items={paginatedItems}
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-4">
              <Button
                size="sm"
                variant="flat"
                isDisabled={page === 1}
                onPress={() => setPage(page - 1)}
              >
                ← Previous
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-sm text-default-500">
                  Page <span className="font-semibold text-default-700">{page}</span> of <span className="font-semibold text-default-700">{totalPages}</span>
                </span>
                <span className="text-sm text-default-400">•</span>
                <span className="text-sm text-default-500">
                  Showing <span className="font-semibold text-default-700">{(page - 1) * rowsPerPage + 1}</span>-<span className="font-semibold text-default-700">{Math.min(page * rowsPerPage, sortedItems.length)}</span> of <span className="font-semibold text-default-700">{sortedItems.length}</span> items
                </span>
              </div>
              <Button
                size="sm"
                variant="flat"
                isDisabled={page === totalPages}
                onPress={() => setPage(page + 1)}
              >
                Next →
              </Button>
            </div>
          )}
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
                  addToast({ title: "Error", description: "Failed to regenerate prompt.", color: "danger" });
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
                    addToast({ title: "Warning", description: "Cannot create workflow with empty prompt.", color: "warning" });
                    return;
                  }
                  handleCreateWorkflow();
                } catch (error: any) {
                  logComponentError("createWorkflow", error);
                  addToast({ title: "Error", description: "Failed to create workflow.", color: "danger" });
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
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Edit Image URL</ModalHeader>
              <ModalBody>
                <p className="text-sm text-gray-500 mb-2">
                  Enter a new image URL for: <span className="font-mono">{editingItem?.url}</span>
                </p>
                <Input
                  label="Image URL"
                  placeholder="https://example.com/image.jpg"
                  value={newImageUrl}
                  onValueChange={setNewImageUrl}
                  variant="bordered"
                />
                {newImageUrl && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">Preview:</p>
                    <img 
                      src={newImageUrl} 
                      alt="Preview" 
                      className="w-full h-48 object-contain border rounded bg-gray-50"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" onPress={handleSaveImage} isLoading={isUpdatingImage}>
                  Save
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}