"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, SortDescriptor } from "@heroui/table";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { addToast } from "@heroui/toast";

interface BlacklistManagerProps {
  blacklist: string[];
  onUpdate: (newList: string[]) => Promise<boolean>;
}

export default function BlacklistManager({ blacklist, onUpdate }: BlacklistManagerProps) {
  const [newValue, setNewValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [filterValue, setFilterValue] = useState("");
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "pattern",
    direction: "ascending",
  });
  
  const [page, setPage] = useState(1);
  const rowsPerPage = 5;

  const {isOpen, onOpen, onOpenChange} = useDisclosure();
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    let filtered = [...blacklist];
    if (filterValue) {
      filtered = filtered.filter((item) =>
        item.toLowerCase().includes(filterValue.toLowerCase())
      );
    }
    return filtered;
  }, [blacklist, filterValue]);

  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems].sort((a, b) => {
      const cmp = a < b ? -1 : a > b ? 1 : 0;
      return sortDescriptor.direction === "descending" ? -cmp : cmp;
    });
    return sorted;
  }, [filteredItems, sortDescriptor]);

  const items = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return sortedItems.slice(start, end);
  }, [page, sortedItems]);

  const totalPages = Math.ceil(filteredItems.length / rowsPerPage);

  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
        setPage(totalPages);
    }
  }, [totalPages, page]);

  const addItem = async () => {
    if (!newValue.trim()) return;
    if (blacklist.includes(newValue.trim())) {
        setNewValue("");
        addToast({ title: "Info", description: "Pattern already exists", color: "primary" });
        return;
    }
    setLoading(true);
    const success = await onUpdate([...blacklist, newValue.trim()]);
    if (success) {
        setNewValue("");
        addToast({ title: "Success", description: "Pattern added", color: "success" });
    }
    setLoading(false);
  };

  const confirmDelete = (item: string) => {
      setItemToDelete(item);
      onOpen();
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setLoading(true);
    await onUpdate(blacklist.filter((i) => i !== itemToDelete));
    setLoading(false);
    setItemToDelete(null);
    onOpenChange(); // Close modal
    addToast({ title: "Success", description: "Pattern removed", color: "success" });
  };

  return (
    <Card className="w-full mt-4">
      <CardHeader className="font-bold text-lg">Scraping Blacklist</CardHeader>
      <CardBody>
        <p className="text-sm text-gray-500 mb-4">
          Add URL patterns to exclude from scraping. Matches are simple text inclusion (e.g. "/cart/" matches "domain.com/cart/item").
        </p>
        
        <div className="flex flex-col gap-4">
            <div className="flex gap-2">
            <Input 
                placeholder="Enter URL pattern (e.g. /login, /admin)" 
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItem()}
                fullWidth
                isDisabled={loading}
            />
            <Button color="primary" onPress={addItem} isLoading={loading}>
                Add
            </Button>
            </div>

            <div className="flex justify-between items-center">
                <Input
                    isClearable
                    className="w-full sm:max-w-[44%]"
                    placeholder="Search patterns..."
                    value={filterValue}
                    onClear={() => {
                        setFilterValue("");
                        setPage(1);
                    }}
                    onValueChange={(val) => {
                        setFilterValue(val);
                        setPage(1);
                    }}
                    startContent={
                        <svg aria-hidden="true" fill="none" focusable="false" height="1em" role="presentation" viewBox="0 0 24 24" width="1em" className="text-default-400">
                            <path d="M11.5 21C16.7467 21 21 16.7467 21 11.5C21 6.25329 16.7467 2 11.5 2C6.25329 2 2 6.25329 2 11.5C2 16.7467 6.25329 21 11.5 21Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                            <path d="M22 22L20 20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                        </svg>
                    }
                />
                <span className="text-default-400 text-small">Total: {blacklist.length}</span>
            </div>

            <Table 
                aria-label="Blacklist Table"
                sortDescriptor={sortDescriptor}
                onSortChange={setSortDescriptor}
                classNames={{
                    wrapper: "max-h-[400px]",
                }}
                bottomContent={
                    totalPages > 1 ? (
                        <div className="flex w-full justify-center gap-2">
                            <Button
                                isDisabled={page === 1}
                                size="sm"
                                variant="flat"
                                onPress={() => setPage((prev) => (prev > 1 ? prev - 1 : prev))}
                            >
                                Previous
                            </Button>
                            <span className="flex items-center text-small text-default-400">
                                {page} of {totalPages}
                            </span>
                            <Button
                                isDisabled={page === totalPages}
                                size="sm"
                                variant="flat"
                                onPress={() => setPage((prev) => (prev < totalPages ? prev + 1 : prev))}
                            >
                                Next
                            </Button>
                        </div>
                    ) : null
                }
            >
                <TableHeader>
                    <TableColumn key="pattern" allowsSorting>PATTERN</TableColumn>
                    <TableColumn key="actions" align="end">ACTIONS</TableColumn>
                </TableHeader>
                <TableBody emptyContent={"No items in blacklist"} items={items.map((item, idx) => ({ id: idx, pattern: item }))}>
                    {(item) => (
                        <TableRow key={item.pattern}>
                            <TableCell>{item.pattern}</TableCell>
                            <TableCell>
                                <div className="flex justify-end gap-2">
                                    <Button 
                                        isIconOnly 
                                        size="sm" 
                                        variant="light" 
                                        color="danger" 
                                        onPress={() => confirmDelete(item.pattern)}
                                        isDisabled={loading}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>

        <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1">Confirm Deletion</ModalHeader>
                        <ModalBody>
                            <p>Are you sure you want to remove <strong>{itemToDelete}</strong> from the blacklist?</p>
                        </ModalBody>
                        <ModalFooter>
                            <Button color="default" variant="light" onPress={onClose}>
                                Cancel
                            </Button>
                            <Button color="danger" onPress={handleDelete} isLoading={loading}>
                                Remove
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
      </CardBody>
    </Card>
  );
}
