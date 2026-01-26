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
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";
import { Button } from "@heroui/button";
import { TrashIcon } from "./TrashIcon";
import { VerticalDotsIcon } from "./VerticalDotsIcon";
import { Textarea } from "@heroui/input";
import { Input } from "@heroui/input";
import { Switch } from "@heroui/switch";
import { Checkbox } from "@heroui/checkbox";
import { Chip } from "@heroui/chip";
import { addToast } from "@heroui/toast";

export interface ScrapedDataItem {
  url: string;
  title: string;
  content: string;
  textLength: number;
  selected: boolean;
  main?: boolean;
  image?: string;
  originalIndex?: number; // To help with updates if needed
}

export interface ScrapedPagesTableProps {
  data: ScrapedDataItem[];
  onToggleSelect: (url: string) => void;
  onSelectionChange?: (urls: string[], selected: boolean) => void; // For bulk selection
  onDelete?: (url: string) => void;
  onRescrape?: (url: string, usePlaywright?: boolean) => Promise<void> | void;
  onUpdateImage?: (url: string, newImageUrl: string) => Promise<void>;
  onToggleMain?: (url: string, isMain: boolean) => Promise<void> | void;
  
  // Optional overrides
  headerContent?: React.ReactNode;
  selectionMode?: "none" | "single" | "multiple";
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

const logComponentError = (context: string, error: any, additionalData?: any) => {
  console.error(`[ScrapedPagesTable:${context}] Error:`, {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    additionalData
  });
};

export default function ScrapedPagesTable({
  data,
  onToggleSelect,
  onSelectionChange,
  onDelete,
  onRescrape,
  onUpdateImage,
  onToggleMain,
  headerContent
}: ScrapedPagesTableProps) {
  const [sortDescriptor, setSortDescriptor] = React.useState<SortDescriptor>({
    column: "url",
    direction: "ascending",
  });
  const [page, setPage] = React.useState(1);
  const [searchQuery, setSearchQuery] = React.useState("");
  const rowsPerPage = 20;

  // Edit Image Modal State
  const {isOpen, onOpen, onOpenChange} = useDisclosure();
  const [editingItem, setEditingItem] = React.useState<ScrapedDataItem | null>(null);
  const [newImageUrl, setNewImageUrl] = React.useState("");
  const [isUpdatingImage, setIsUpdatingImage] = React.useState(false);

  // View Content Modal State
  const [viewContentItem, setViewContentItem] = React.useState<ScrapedDataItem | null>(null);
  const { isOpen: isViewContentOpen, onOpen: onViewContentOpen, onOpenChange: onViewContentOpenChange } = useDisclosure();

  const openViewContentModal = (item: ScrapedDataItem) => {
    setViewContentItem(item);
    onViewContentOpen();
  };

  const openEditImageModal = (item: ScrapedDataItem) => {
    setEditingItem(item);
    setNewImageUrl(item.image || "");
    onOpen();
  };

  const handleSaveImage = async () => {
    if (!editingItem || !onUpdateImage) return;
    
    setIsUpdatingImage(true);
    try {
      await onUpdateImage(editingItem.url, newImageUrl);
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

  const sortedItems = React.useMemo(() => {
    try {
      // Filter by search query
      const filteredData = data.filter(item => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          item.url.toLowerCase().includes(query) ||
          item.title.toLowerCase().includes(query)
        );
      });

      return [...filteredData].sort((a, b) => {
        if (sortDescriptor.column === 'select') return 0;
        
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
      logComponentError("sortedItems", error, { sortDescriptor, dataLength: data.length });
      return data;
    }
  }, [sortDescriptor, data, searchQuery]);

  // Paginated items
  const paginatedItems = React.useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return sortedItems.slice(start, end);
  }, [sortedItems, page]);

  const totalPages = Math.ceil(sortedItems.length / rowsPerPage);

  // Reset to page 1 when sorting changes
  React.useEffect(() => {
    setPage(1);
  }, [sortDescriptor]);

  const renderCell = React.useCallback(
    (item: ScrapedDataItem, columnKey: React.Key) => {
      try {
        const cellValue = getKeyValue(item, columnKey as keyof ScrapedDataItem);

        switch (columnKey) {
          case "select":
            return (
              <Checkbox
                isSelected={item.selected}
                onValueChange={() => onToggleSelect(item.url)}
                aria-label={`Select row ${item.url}`}
              />
            );
          case "main":
            return onToggleMain ? (
              <Switch
                isSelected={!!item.main}
                size="sm"
                color="success"
                onValueChange={() => onToggleMain(item.url, !item.main)}
                aria-label={`Toggle main status for ${item.url}`}
              />
            ) : (
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
                className="text-blue-500 hover:underline truncate block max-w-[300px]"
                onClick={(e) => {
                  try {
                    new URL(item.url);
                  } catch {
                    e.preventDefault();
                    addToast({ title: "Error", description: `Invalid URL: ${item.url}`, color: "danger" });
                  }
                }}
              >
                {item.url}
              </a>
            );
          case "title":
            return <span className="truncate block max-w-[200px]" title={item.title}>{item.title}</span>;
          case "image":
            return item.image ? (
              <img 
                src={item.image} 
                alt={item.title || "Page image"} 
                className="w-16 h-16 object-cover rounded"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <span className="text-gray-400 text-sm">No image</span>
            );
          case "textLength":
             return <span>{item.textLength?.toLocaleString()}</span>;
          case "actions":
            return (
              <div className="relative flex justify-end items-center gap-2">
                <Dropdown>
                  <DropdownTrigger>
                    <Button isIconOnly size="sm" variant="light">
                      <VerticalDotsIcon className="text-default-300" />
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu aria-label="Page actions">
                    <DropdownItem
                      key="view-content"
                      startContent={
                        <svg className="w-4 h-4 text-default-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      }
                      onPress={() => openViewContentModal(item)}
                    >
                      View Content
                    </DropdownItem>
                    {onUpdateImage ? (
                      <DropdownItem
                        key="edit-image"
                        startContent={<EditIcon className="w-4 h-4 text-default-500" />}
                        onPress={() => openEditImageModal(item)}
                      >
                        Edit Image
                      </DropdownItem>
                    ) : (null as any)}
                    {onRescrape ? (
                      <DropdownItem
                        key="rescrape"
                        startContent={
                          <svg className="w-4 h-4 text-default-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        }
                        onPress={async () => {
                           await onRescrape(item.url, false);
                        }}
                      >
                        Rescrape
                      </DropdownItem>
                    ) : (null as any)}
                    {onRescrape ? (
                      <DropdownItem
                        key="rescrape-playwright"
                        startContent={
                          <svg className="w-4 h-4 text-default-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        }
                        onPress={async () => {
                           await onRescrape(item.url, true);
                        }}
                      >
                        Rescrape (Playwright)
                      </DropdownItem>
                    ) : (null as any)}
                    {onDelete ? (
                        <DropdownItem
                        key="delete"
                        className="text-danger"
                        color="danger"
                        startContent={<TrashIcon className="w-4 h-4" />}
                        onPress={() => onDelete(item.url)}
                        >
                        Delete
                        </DropdownItem>
                    ) : (null as any)}
                  </DropdownMenu>
                </Dropdown>
              </div>
            );
          default:
            return cellValue;
        }
      } catch (error: any) {
        logComponentError("renderCell", error, { item, columnKey });
        return <span className="text-red-500">Error</span>;
      }
    },
    [onDelete, onRescrape, onToggleSelect, onToggleMain, onUpdateImage]
  );

  return (
    <div className="w-full flex flex-col gap-4">
      {headerContent}
      
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
            Showing {sortedItems.length} of {data.length} pages
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
                         if (onSelectionChange) {
                             const urls = paginatedItems.map(i => i.url);
                             onSelectionChange(urls, isSelected);
                         } else {
                            // Fallback if no bulk handler
                            paginatedItems.forEach((item) => {
                                if (item.selected !== isSelected) {
                                    onToggleSelect(item.url);
                                }
                            });
                         }
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
            emptyContent={"No pages found."}
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

      {/* View Content Modal */}
      <Modal 
        isOpen={isViewContentOpen} 
        onOpenChange={onViewContentOpenChange}
        size="5xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Content for {viewContentItem?.url}
              </ModalHeader>
              <ModalBody>
                <div className="whitespace-pre-wrap font-mono text-sm">
                  {viewContentItem?.content}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="primary" onPress={onClose}>
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Edit Image Modal */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Edit Page Image</ModalHeader>
              <ModalBody>
                <p className="text-sm text-default-500 mb-2">
                  Enter the URL of the product/page image.
                </p>
                <Input
                  label="Image URL"
                  placeholder="https://example.com/image.jpg"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  variant="bordered"
                />
                {newImageUrl && (
                  <div className="mt-2 flex justify-center">
                    <img
                      src={newImageUrl}
                      alt="Preview"
                      className="max-h-48 object-contain rounded border"
                      onError={(e) => {
                         // e.currentTarget.style.display = 'none';
                         // keep it to show broken link
                      }}
                    />
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button 
                  color="primary" 
                  onPress={handleSaveImage}
                  isLoading={isUpdatingImage}
                >
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
