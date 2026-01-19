"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Input } from "@heroui/input";
import { Switch } from "@heroui/switch";
import { Checkbox } from "@heroui/checkbox";
import { Link } from "@heroui/link";

interface ScrapedDataItem {
  url: string;
  title: string;
  content: string;
  textLength: number;
  main?: boolean;
  image?: string;
}

interface SortDescriptor {
  column: string;
  direction: "ascending" | "descending";
}

interface ScrapedDataTableProps {
  scrapedData: ScrapedDataItem[];
  onRescrape: (urls: string[], options?: { keepImages: boolean; useAI: boolean }) => void;
  isLoading: boolean;
  onFindMorePages?: () => void;
  onBlacklist?: (urls: string[]) => void;
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

export default function ScrapedDataTable({
  scrapedData,
  onRescrape,
  isLoading,
  onFindMorePages,
  onBlacklist,
}: ScrapedDataTableProps) {
  const [selectedKeys, setSelectedKeys] = useState<any>(new Set([]));
  const [filterValue, setFilterValue] = useState("");
  const [keepImages, setKeepImages] = useState(true);
  const [useAI, setUseAI] = useState(false);
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
    onRescrape(selectedUrls, { keepImages, useAI });
    setSelectedKeys(new Set([]));
  };

  const handleRescrapeSingle = (url: string) => {
      onRescrape([url], { keepImages, useAI });
  };

  const handleBlacklistSelected = () => {
      if (!onBlacklist) return;
      let selectedUrls: string[] = [];
      if (selectedKeys === "all") {
          selectedUrls = filteredItems.map(i => i.url);
      } else {
          selectedUrls = Array.from(selectedKeys as Set<string>);
      }
      onBlacklist(selectedUrls);
      setSelectedKeys(new Set([]));
  };

  return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between gap-3 items-end">
            <Input
            isClearable
            className="w-full md:max-w-md"
            placeholder="Search by URL or Title..."
            startContent={<SearchIcon className="text-default-300" />}
            value={filterValue}
            onClear={() => setFilterValue("")}
            onValueChange={setFilterValue}
            />
            <div className="flex flex-col gap-2 items-end w-full md:w-auto">
                <div className="flex gap-4 items-center flex-wrap justify-end">
                    <Switch isSelected={keepImages} onValueChange={setKeepImages} size="sm">
                        Keep old images
                    </Switch>
                    {!keepImages && (
                        <Switch isSelected={useAI} onValueChange={setUseAI} size="sm" color="secondary">
                            AI Image Selection
                        </Switch>
                    )}
                </div>
                <div className="flex gap-3">
                    {onFindMorePages && (
                        <Button 
                            color="secondary" 
                            variant="flat"
                            isLoading={isLoading}
                            onPress={onFindMorePages}
                        >
                            Find New Pages
                        </Button>
                    )}
                    {(selectedKeys === "all" || (selectedKeys instanceof Set && selectedKeys.size > 0)) && onBlacklist && (
                        <Button
                            color="danger"
                            variant="flat"
                            onPress={handleBlacklistSelected}
                            isLoading={isLoading}
                        >
                            Blacklist Selected
                        </Button>
                    )}
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
        </div>
        
        <div className="border rounded-lg overflow-hidden mt-4 bg-content1 shadow-sm">
            <div className="grid grid-cols-12 gap-4 p-3 bg-default-100 font-medium text-small text-default-500 border-b">
                <div className="col-span-1 flex items-center justify-center">
                  <Checkbox 
                      isSelected={selectedKeys === "all" || (selectedKeys instanceof Set && selectedKeys.size === filteredItems.length && filteredItems.length > 0)}
                      onValueChange={(isSelected) => {
                          if (isSelected) {
                              setSelectedKeys("all");
                          } else {
                              setSelectedKeys(new Set([]));
                          }
                      }}
                  />
                </div>
                <div 
                  className="col-span-5 cursor-pointer hover:text-foreground flex items-center gap-1"
                  onClick={() => setSortDescriptor({ 
                      column: "url", 
                      direction: sortDescriptor.column === "url" && sortDescriptor.direction === "ascending" ? "descending" : "ascending" 
                  })}
                >
                    URL {sortDescriptor.column === "url" && (sortDescriptor.direction === "ascending" ? "↑" : "↓")}
                </div>
                <div 
                  className="col-span-3 cursor-pointer hover:text-foreground flex items-center gap-1"
                  onClick={() => setSortDescriptor({ 
                      column: "title", 
                      direction: sortDescriptor.column === "title" && sortDescriptor.direction === "ascending" ? "descending" : "ascending" 
                  })}
                >
                    TITLE {sortDescriptor.column === "title" && (sortDescriptor.direction === "ascending" ? "↑" : "↓")}
                </div>
                <div 
                  className="col-span-1 cursor-pointer hover:text-foreground flex items-center gap-1"
                  onClick={() => setSortDescriptor({ 
                      column: "textLength", 
                      direction: sortDescriptor.column === "textLength" && sortDescriptor.direction === "ascending" ? "descending" : "ascending" 
                  })}
                >
                    LENGTH {sortDescriptor.column === "textLength" && (sortDescriptor.direction === "ascending" ? "↑" : "↓")}
                </div>
                <div className="col-span-2 text-right">ACTIONS</div>
            </div>
            
            <div className="overflow-y-auto max-h-[600px]">
              {sortedItems.length > 0 ? (
                  sortedItems.map((item) => (
                      <div key={item.url} className="grid grid-cols-12 gap-4 p-3 border-b last:border-0 hover:bg-default-50 items-center transition-colors">
                          <div className="col-span-1 flex items-center justify-center">
                              <Checkbox 
                                  isSelected={selectedKeys === "all" || (selectedKeys instanceof Set && selectedKeys.has(item.url))}
                                  onValueChange={(isSelected) => {
                                      const newKeys = new Set(selectedKeys === "all" ? filteredItems.map(i => i.url) : selectedKeys);
                                      if (isSelected) {
                                          newKeys.add(item.url);
                                      } else {
                                          newKeys.delete(item.url);
                                      }
                                      setSelectedKeys(newKeys);
                                  }}
                              />
                          </div>
                          <div className="col-span-5 overflow-hidden">
                              <div className="flex flex-col gap-1">
                                  <Link href={item.url} target="_blank" size="sm" className="truncate text-foreground block" title={item.url}>
                                    {item.url}
                                  </Link>
                                  <div className="flex gap-2 items-center">
                                      {item.main && <Chip size="sm" color="secondary" variant="flat" className="h-5 text-[10px]">Main Page</Chip>}
                                      {item.image && <Chip size="sm" color="success" variant="flat" className="h-5 text-[10px]">Has Image</Chip>}
                                  </div>
                              </div>
                          </div>
                          <div className="col-span-3 truncate text-small text-default-600" title={item.title}>
                              {item.title || <i>No title</i>}
                          </div>
                          <div className="col-span-1 text-small text-default-500">
                              {item.textLength.toLocaleString()}
                          </div>
                          <div className="col-span-2 flex justify-end gap-1">
                              {onBlacklist && (
                                <Button
                                    size="sm"
                                    variant="light"
                                    color="danger"
                                    isIconOnly
                                    title="Blacklist & Delete"
                                    onPress={() => onBlacklist([item.url])}
                                    isLoading={isLoading}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                                </Button>
                              )}
                              <Button 
                                  size="sm" 
                                  variant="light" 
                                  color="primary"
                                  onPress={() => handleRescrapeSingle(item.url)}
                                  isLoading={isLoading}
                              >
                                  Re-scrape
                              </Button>
                          </div>
                      </div>
                  ))
              ) : (
                  <div className="p-12 text-center text-default-500 bg-default-50">
                      No scraped pages found matching your filter.
                  </div>
              )}
            </div>
            <div className="p-2 border-t bg-default-50 text-xs text-default-400 text-center">
                Showing {sortedItems.length} of {scrapedData.length} pages
            </div>
        </div>
      </div>
  );
}
