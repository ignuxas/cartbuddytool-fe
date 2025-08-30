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
}: ResultsDisplayProps) {
  const [sortDescriptor, setSortDescriptor] = React.useState<SortDescriptor>({
    column: "url",
    direction: "ascending",
  });

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

  if (scrapedData.length === 0 && !prompt && !workflowResult) {
    return null;
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {scrapedData.length > 0 && (
        <div>
          <h3 className="text-xl font-bold mb-2">
            Scraped Pages ({scrapedData.length})
          </h3>
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