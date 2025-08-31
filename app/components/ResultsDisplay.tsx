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

interface ScrapedDataItem {
  url: string;
  title: string;
  content: string;
  textLength: number;
}

interface WorkflowResult {
  workflow_id: string;
  workflow_url: string;
  sheet_id: string;
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
  handleDeleteItem: (url: string, domain: string) => void;
  setPrompt: (prompt: string) => void;
  showAddMorePages: boolean;
  onShowAddMorePages: () => void;
  additionalUrls: { url: string; selected: boolean }[];
  onToggleAdditionalUrl: (url: string) => void;
  onAddAdditionalUrl: (url: string) => void;
  onScrapeAdditionalPages: () => void;
  onCancelAddMorePages: () => void;
}

const columns = [
  { key: "url", label: "URL" },
  { key: "title", label: "Title" },
  { key: "textLength", label: "Text Length" },
  { key: "actions", label: "Actions" },
];

export default function ResultsDisplay({
  scrapedData,
  prompt,
  workflowResult,
  handleRegeneratePrompt,
  handleCreateWorkflow,
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
}: ResultsDisplayProps) {
  const [sortDescriptor, setSortDescriptor] = React.useState<SortDescriptor>({
    column: "url",
    direction: "ascending",
  });
  const [newAdditionalUrl, setNewAdditionalUrl] = React.useState("");

  const sortedItems = React.useMemo(() => {
    return [...scrapedData].sort((a, b) => {
      const first = a[sortDescriptor.column as keyof ScrapedDataItem];
      const second = b[sortDescriptor.column as keyof ScrapedDataItem];
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
  }, [sortDescriptor, scrapedData]);

  const renderCell = React.useCallback(
    (item: ScrapedDataItem, columnKey: React.Key) => {
      const cellValue = getKeyValue(item, columnKey as keyof ScrapedDataItem);

      switch (columnKey) {
        case "url":
          return (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline truncate"
            >
              {item.url}
            </a>
          );
        case "title":
          return <span className="truncate">{item.title}</span>;
        case "actions":
          return (
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={() => {
                const domain = new URL(url).hostname;
                handleDeleteItem(item.url, domain);
              }}
              aria-label={`Delete item ${item.url}`}
            >
              <TrashIcon className="text-lg text-danger" />
            </Button>
          );
        default:
          return cellValue;
      }
    },
    [handleDeleteItem, url]
  );

  const handleAddAdditionalUrl = () => {
    if (newAdditionalUrl) {
      onAddAdditionalUrl(newAdditionalUrl);
      setNewAdditionalUrl("");
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
                      additionalUrls.forEach((item) => {
                        if (!item.selected) onToggleAdditionalUrl(item.url);
                      });
                    }}
                  >
                    Select All
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      additionalUrls.forEach((item) => {
                        if (item.selected) onToggleAdditionalUrl(item.url);
                      });
                    }}
                  >
                    Deselect All
                  </Button>
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-md p-2 flex flex-col gap-2 mb-2">
                  {additionalUrls.length > 0 ? (
                    additionalUrls.map((item) => (
                      <Checkbox
                        key={item.url}
                        isSelected={item.selected}
                        onValueChange={() => onToggleAdditionalUrl(item.url)}
                        size="sm"
                      >
                        <span className="text-sm truncate">{item.url}</span>
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
                    placeholder="Add custom URL"
                    onKeyDown={(e) => e.key === "Enter" && handleAddAdditionalUrl()}
                  />
                  <Button onClick={handleAddAdditionalUrl}>Add</Button>
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
              {(column) => (
                <TableColumn
                  key={column.key}
                  allowsSorting={column.key !== "actions"}
                >
                  {column.label}
                </TableColumn>
              )}
            </TableHeader>
            <TableBody
              items={sortedItems}
              emptyContent={"No pages scraped yet."}
            >
              {(item) => (
                <TableRow key={item.url}>
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
            onValueChange={setPrompt}
            minRows={10}
            maxRows={20}
            className="text-sm"
          />
          <div className="flex gap-2 mt-2">
            <Button
              onClick={handleRegeneratePrompt}
              isLoading={retryLoading === "prompt"}
              disabled={!!retryLoading}
            >
              Regenerate Prompt
            </Button>
            <Button
              color="secondary"
              onClick={handleCreateWorkflow}
              isLoading={retryLoading === "workflow"}
              disabled={!!retryLoading}
            >
              Create n8n Workflow
            </Button>
          </div>
        </div>
      )}

      {workflowResult && (
        <div>
          <h3 className="text-xl font-bold">Workflow Created</h3>
          <p>Workflow ID: {workflowResult.workflow_id}</p>
          <p>
            <a
              href={workflowResult.workflow_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              View Workflow
            </a>
          </p>
        </div>
      )}
    </div>
  );
}