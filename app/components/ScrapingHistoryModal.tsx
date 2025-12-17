"use client";

import React, { useState, useMemo } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  SortDescriptor,
} from "@heroui/table";
import { Chip } from "@heroui/chip";
import { Input } from "@heroui/input";

interface ScrapedDataItem {
  url: string;
  title: string;
  content: string;
  textLength: number;
  main?: boolean;
  image?: string;
}

interface ScrapingHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  scrapedData: ScrapedDataItem[];
  onRescrape: (urls: string[]) => void;
  isLoading: boolean;
}

const SearchIcon = (props: any) => (
  <svg
    aria-hidden="true"
    fill="none"
    focusable="false"
    height="1em"
    role="presentation"
    viewBox="0 0 24 24"
    width="1em"
    {...props}
  >
    <path
      d="M11.5 21C16.7467 21 21 16.7467 21 11.5C21 6.25329 16.7467 2 11.5 2C6.25329 2 2 6.25329 2 11.5C2 16.7467 6.25329 21 11.5 21Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
    <path
      d="M22 22L20 20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  </svg>
);

export default function ScrapingHistoryModal({
  isOpen,
  onClose,
  scrapedData,
  onRescrape,
  isLoading,
}: ScrapingHistoryModalProps) {
  const [selectedKeys, setSelectedKeys] = useState<any>(new Set([]));
  const [filterValue, setFilterValue] = useState("");
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "url",
    direction: "ascending",
  });

  const hasSearchFilter = Boolean(filterValue);

  const filteredItems = useMemo(() => {
    let filtered = [...scrapedData];

    if (hasSearchFilter) {
      filtered = filtered.filter((item) =>
        item.url.toLowerCase().includes(filterValue.toLowerCase()) ||
        item.title.toLowerCase().includes(filterValue.toLowerCase())
      );
    }

    return filtered;
  }, [scrapedData, filterValue]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a: any, b: any) => {
      const first = a[sortDescriptor.column as keyof ScrapedDataItem];
      const second = b[sortDescriptor.column as keyof ScrapedDataItem];
      const cmp = first < second ? -1 : first > second ? 1 : 0;

      return sortDescriptor.direction === "descending" ? -cmp : cmp;
    });
  }, [filteredItems, sortDescriptor]);

  const handleRescrapeSelected = () => {
    let selectedUrls: string[] = [];
    if (selectedKeys === "all") {
        selectedUrls = filteredItems.map(i => i.url);
    } else {
        selectedUrls = Array.from(selectedKeys as Set<string>);
    }
    onRescrape(selectedUrls);
    setSelectedKeys(new Set([]));
  };

  const handleRescrapeSingle = (url: string) => {
      onRescrape([url]);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      size="5xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              Scraping History & Retry
              <p className="text-sm font-normal text-default-500">
                Select pages to re-scrape. This will overwrite existing data for these pages.
              </p>
            </ModalHeader>
            <ModalBody>
              <div className="flex justify-between gap-3 items-end">
                <Input
                  isClearable
                  className="w-full sm:max-w-[44%]"
                  placeholder="Search by URL or Title..."
                  startContent={<SearchIcon className="text-default-300" />}
                  value={filterValue}
                  onClear={() => setFilterValue("")}
                  onValueChange={setFilterValue}
                />
                <div className="flex gap-3">
                    <Button 
                        color="primary" 
                        isDisabled={selectedKeys !== "all" && selectedKeys.size === 0}
                        isLoading={isLoading}
                        onPress={handleRescrapeSelected}
                    >
                        Re-scrape Selected
                    </Button>
                </div>
              </div>
              
              <Table
                aria-label="Scraping history table"
                isHeaderSticky
                selectionMode="multiple"
                selectedKeys={selectedKeys}
                onSelectionChange={setSelectedKeys}
                sortDescriptor={sortDescriptor}
                onSortChange={setSortDescriptor}
                classNames={{
                    wrapper: "max-h-[400px]",
                }}
              >
                <TableHeader>
                  <TableColumn key="url" allowsSorting>URL</TableColumn>
                  <TableColumn key="title" allowsSorting>TITLE</TableColumn>
                  <TableColumn key="textLength" allowsSorting>LENGTH</TableColumn>
                  <TableColumn key="actions">ACTIONS</TableColumn>
                </TableHeader>
                <TableBody items={sortedItems} emptyContent={"No scraped pages found."}>
                  {(item) => (
                    <TableRow key={item.url}>
                      <TableCell>
                          <div className="flex flex-col">
                              <span className="text-small">{item.url}</span>
                              {item.main && <Chip size="sm" color="secondary" variant="flat">Main Page</Chip>}
                          </div>
                      </TableCell>
                      <TableCell>{item.title}</TableCell>
                      <TableCell>{item.textLength}</TableCell>
                      <TableCell>
                        <Button 
                            size="sm" 
                            variant="light" 
                            color="primary"
                            onPress={() => handleRescrapeSingle(item.url)}
                            isLoading={isLoading}
                        >
                            Re-scrape
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="light" onPress={onClose}>
                Close
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
