"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Input, Textarea } from "@heroui/input";
import { Spinner } from "@heroui/spinner";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/dropdown";
import { Pagination } from "@heroui/pagination";
import { Select, SelectItem } from "@heroui/select";
import { addToast } from "@heroui/toast";
import { Tooltip } from "@heroui/tooltip";
import { useRouter } from "next/navigation";

import { useAuth } from "@/app/contexts/AuthContext";
import { config } from "@/lib/config";
import { getAuthHeaders } from "@/app/utils/apiHelper";

// ── Types ────────────────────────────────────────────────────────────────

interface Lead {
  id: number;
  website: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  net_profit: number | null;
  sales_revenue: number | null;
  status: string;
  is_scraped: boolean;
  scraped_domain: string | null;
  generated_email_subject: string | null;
  generated_email_body: string | null;
  email_generated_at: string | null;
  email_model: string | null;
  detected_language: string | null;
  email_sent: boolean;
  email_sent_at: string | null;
  tags: string[];
  last_updated_by: string | null;
  created_at: string;
  updated_at: string;
}

interface User {
  id: string;
  email: string;
}

interface Stats {
  total: number;
  scraped: number;
  not_scraped: number;
  emails_generated: number;
  emails_sent: number;
  new: number;
  generating: number;
  errors: number;
}

interface MarketerSettings {
  ai_model: string;
  email_template_intro: string;
  email_template_footer: string;
  demo_base_url: string;
  custom_prompt_instructions?: string;
}

// ── Status styling ───────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    color:
      | "default"
      | "primary"
      | "success"
      | "warning"
      | "danger"
      | "secondary";
  }
> = {
  new: { label: "New", color: "default" },
  generating: { label: "Generating…", color: "warning" },
  email_ready: { label: "Email Ready", color: "success" },
  email_error: { label: "Error", color: "danger" },
  sent: { label: "Sent", color: "primary" },
  sold: { label: "Sold", color: "success" },
  in_talks: { label: "In Talks", color: "secondary" },
  turned_down: { label: "Turned Down", color: "danger" },
};

// ── Component ────────────────────────────────────────────────────────────

export default function MarketerPage() {
  const {
    isAuthenticated,
    isSuperAdmin,
    isLoading: authLoading,
    accessToken,
  } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Data state ──
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage, _setPerPage] = useState(25);

  // ── Filters ──
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filterLastUpdatedBy, setFilterLastUpdatedBy] = useState<string>("");
  const [scrapedFilter, setScrapedFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");

  // ── Modals ──
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [emailViewOpen, setEmailViewOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // ── Form state ──
  const [newLead, setNewLead] = useState({
    website: "",
    email: "",
    phone: "",
    notes: "",
    net_profit: "",
    sales_revenue: "",
  });
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [viewingEmail, setViewingEmail] = useState<Lead | null>(null);
  const [settings, setSettings] = useState<MarketerSettings>({
    ai_model: "gemini-2.5-flash",
    email_template_intro: "",
    email_template_footer: "",
    demo_base_url: "",
    custom_prompt_instructions: "",
  });

  // ── Import state ──
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── Selected ──
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // ── Polling for generating status ──
  const [polling, setPolling] = useState(false);

  // ── Auth guard ──
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !isSuperAdmin) {
      router.replace("/");
    }
  }, [authLoading, isAuthenticated, isSuperAdmin, router]);

  // ── Fetch leads ──
  const fetchLeads = useCallback(
    async (isPolling = false) => {
      if (!accessToken) return;
      if (!isPolling) setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          per_page: String(perPage),
          sort_by: sortBy,
          sort_dir: sortDir,
        });

        if (searchQuery) params.set("search", searchQuery);
        if (statusFilter) params.set("status", statusFilter);
        if (filterLastUpdatedBy)
          params.set("last_updated_by", filterLastUpdatedBy);
        if (scrapedFilter) params.set("scraped", scrapedFilter);
        if (emailFilter) params.set("has_email_generated", emailFilter);

        const res = await fetch(
          `${config.serverUrl}/api/marketer/leads/?${params}`,
          { headers: getAuthHeaders(accessToken) },
        );

        if (!res.ok) throw new Error("Failed to fetch leads");
        const data = await res.json();

        setLeads(data.leads || []);
        setTotal(data.total || 0);
        setTotalPages(data.total_pages || 1);

        // Check if any are generating — start poll
        const anyGenerating = (data.leads || []).some(
          (l: Lead) => l.status === "generating",
        );

        setPolling(anyGenerating);
      } catch (e: any) {
        addToast({ title: "Error", description: e.message, color: "danger" });
      } finally {
        if (!isPolling) setLoading(false);
      }
    },
    [
      accessToken,
      page,
      perPage,
      sortBy,
      sortDir,
      searchQuery,
      statusFilter,
      scrapedFilter,
      emailFilter,
      filterLastUpdatedBy,
    ],
  );

  // ── Fetch users ──
  const fetchUsers = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${config.serverUrl}/api/users/`, {
        headers: getAuthHeaders(accessToken),
      });

      if (res.ok) {
        const data = await res.json();
        // The API returns { users: [...] }
        const usersList = Array.isArray(data.users) ? data.users : [];

        setUsers(usersList);
      }
    } catch (_) {}
  }, [accessToken]);

  // ── Fetch stats ──
  const fetchStats = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${config.serverUrl}/api/marketer/stats/`, {
        headers: getAuthHeaders(accessToken),
      });

      if (res.ok) {
        const data = await res.json();

        setStats(data);
      }
    } catch (_) {}
  }, [accessToken]);

  // ── Fetch settings ──
  const fetchSettings = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${config.serverUrl}/api/marketer/settings/`, {
        headers: getAuthHeaders(accessToken),
      });

      if (res.ok) {
        const data = await res.json();

        if (data.settings) setSettings(data.settings);
      }
    } catch (_) {}
  }, [accessToken]);

  const handleRefreshScrape = useCallback(
    async (silent = false) => {
      if (!accessToken) return;
      if (!silent) setRefreshing(true);
      try {
        const res = await fetch(
          `${config.serverUrl}/api/marketer/leads/refresh-scrape/`,
          {
            method: "POST",
            headers: getAuthHeaders(accessToken),
            body: JSON.stringify({}),
          },
        );
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Failed");
        if (!silent)
          addToast({
            title: "Refreshed",
            description: data.message,
            color: "success",
          });
        fetchLeads();
        fetchStats();
      } catch (e: any) {
        if (!silent)
          addToast({ title: "Error", description: e.message, color: "danger" });
      } finally {
        if (!silent) setRefreshing(false);
      }
    },
    [accessToken, fetchLeads, fetchStats],
  );

  // ── Initial load: refresh scrape status once on mount ──
  const hasInitialRefreshed = useRef(false);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !isSuperAdmin || !accessToken)
      return;
    if (hasInitialRefreshed.current) return;
    hasInitialRefreshed.current = true;
    handleRefreshScrape(true).catch(() => {});
    fetchUsers();
    fetchSettings();
  }, [
    authLoading,
    isAuthenticated,
    isSuperAdmin,
    accessToken,
    handleRefreshScrape,
    fetchUsers,
    fetchSettings,
  ]);

  // ── Re-fetch leads & stats when pagination / filters change ──
  useEffect(() => {
    if (!authLoading && isAuthenticated && isSuperAdmin) {
      fetchLeads();
      fetchStats();
    }
  }, [authLoading, isAuthenticated, isSuperAdmin, fetchLeads, fetchStats]);

  // ── Polling for generating leads ──
  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(() => {
      fetchLeads(true);
      fetchStats();
    }, 4000);

    return () => clearInterval(interval);
  }, [polling, fetchLeads, fetchStats]);

  // ── Actions ──
  const handleAddLead = async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(
        `${config.serverUrl}/api/marketer/leads/create/`,
        {
          method: "POST",
          headers: getAuthHeaders(accessToken),
          body: JSON.stringify({
            ...newLead,
            net_profit: newLead.net_profit
              ? parseFloat(newLead.net_profit)
              : null,
            sales_revenue: newLead.sales_revenue
              ? parseFloat(newLead.sales_revenue)
              : null,
          }),
        },
      );
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to create lead");
      addToast({
        title: "Success",
        description: "Lead added",
        color: "success",
      });
      setAddModalOpen(false);
      setNewLead({
        website: "",
        email: "",
        phone: "",
        notes: "",
        net_profit: "",
        sales_revenue: "",
      });
      fetchLeads();
      fetchStats();
    } catch (e: any) {
      addToast({ title: "Error", description: e.message, color: "danger" });
    }
  };

  const handleImport = async () => {
    if (!accessToken || !importFile) return;
    setImporting(true);
    try {
      const formData = new FormData();

      formData.append("file", importFile);

      const headers: Record<string, string> = {};

      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(
        `${config.serverUrl}/api/marketer/leads/import/`,
        {
          method: "POST",
          headers,
          body: formData,
        },
      );
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Import failed");
      addToast({
        title: "Import Complete",
        description: `${data.created} created, ${data.updated || 0} updated, ${data.skipped} skipped`,
        color: "success",
      });
      if (data.errors && data.errors.length > 0) {
        addToast({
          title: "Import Warnings",
          description: data.errors.slice(0, 3).join("; "),
          color: "warning",
        });
      }
      setImportModalOpen(false);
      setImportFile(null);
      fetchLeads();
      fetchStats();
    } catch (e: any) {
      addToast({ title: "Error", description: e.message, color: "danger" });
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (ids: number[]) => {
    if (!accessToken || ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} lead(s)?`)) return;
    try {
      const res = await fetch(
        `${config.serverUrl}/api/marketer/leads/delete/`,
        {
          method: "DELETE",
          headers: getAuthHeaders(accessToken),
          body: JSON.stringify({ ids }),
        },
      );

      if (!res.ok) throw new Error("Delete failed");
      addToast({
        title: "Deleted",
        description: `${ids.length} lead(s) removed`,
        color: "success",
      });
      setSelectedIds(new Set());
      fetchLeads();
      fetchStats();
    } catch (e: any) {
      addToast({ title: "Error", description: e.message, color: "danger" });
    }
  };

  const handleGenerateEmail = async (ids: number[]) => {
    if (!accessToken) return;
    try {
      const res = await fetch(
        `${config.serverUrl}/api/marketer/leads/generate-email/`,
        {
          method: "POST",
          headers: getAuthHeaders(accessToken),
          body: JSON.stringify({ ids }),
        },
      );
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed");
      addToast({
        title: "Generating",
        description: `Email generation started for ${ids.length} lead(s)`,
        color: "primary",
      });
      setSelectedIds(new Set());
      setTimeout(() => {
        fetchLeads();
        fetchStats();
      }, 1000);
    } catch (e: any) {
      addToast({ title: "Error", description: e.message, color: "danger" });
    }
  };

  const handleRegenerateEmail = async (id: number) => {
    if (!accessToken) return;
    try {
      const res = await fetch(
        `${config.serverUrl}/api/marketer/leads/regenerate-email/`,
        {
          method: "POST",
          headers: getAuthHeaders(accessToken),
          body: JSON.stringify({ id }),
        },
      );

      if (!res.ok) throw new Error("Failed");
      addToast({
        title: "Regenerating",
        description: "Email regeneration started",
        color: "primary",
      });
      setTimeout(() => fetchLeads(), 1000);
    } catch (e: any) {
      addToast({ title: "Error", description: e.message, color: "danger" });
    }
  };

  const handleMarkSent = async (ids: number[]) => {
    if (!accessToken) return;
    try {
      const res = await fetch(
        `${config.serverUrl}/api/marketer/leads/mark-sent/`,
        {
          method: "POST",
          headers: getAuthHeaders(accessToken),
          body: JSON.stringify({ ids }),
        },
      );

      if (!res.ok) throw new Error("Failed");
      addToast({
        title: "Updated",
        description: "Marked as sent",
        color: "success",
      });
      fetchLeads();
      fetchStats();
    } catch (e: any) {
      addToast({ title: "Error", description: e.message, color: "danger" });
    }
  };

  const handleSaveSettings = async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${config.serverUrl}/api/marketer/settings/`, {
        method: "PUT",
        headers: getAuthHeaders(accessToken),
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error("Failed to save settings");
      addToast({
        title: "Saved",
        description: "Settings updated",
        color: "success",
      });
      setSettingsOpen(false);
    } catch (e: any) {
      addToast({ title: "Error", description: e.message, color: "danger" });
    }
  };

  const handleEditSave = async () => {
    if (!accessToken || !editLead) return;
    try {
      const res = await fetch(
        `${config.serverUrl}/api/marketer/leads/update/`,
        {
          method: "PUT",
          headers: getAuthHeaders(accessToken),
          body: JSON.stringify({
            id: editLead.id,
            website: editLead.website,
            email: editLead.email,
            phone: editLead.phone,
            notes: editLead.notes,
            net_profit: editLead.net_profit,
            sales_revenue: editLead.sales_revenue,
            status: editLead.status,
          }),
        },
      );

      if (!res.ok) throw new Error("Update failed");
      addToast({
        title: "Updated",
        description: "Lead updated",
        color: "success",
      });
      setEditModalOpen(false);
      fetchLeads();
    } catch (e: any) {
      addToast({ title: "Error", description: e.message, color: "danger" });
    }
  };

  const handleStatusUpdate = async (leadId: number, status: string) => {
    if (!accessToken) return;
    try {
      const res = await fetch(
        `${config.serverUrl}/api/marketer/leads/update/`,
        {
          method: "PUT",
          headers: getAuthHeaders(accessToken),
          body: JSON.stringify({
            id: leadId,
            status,
          }),
        },
      );

      if (!res.ok) throw new Error("Status update failed");
      addToast({
        title: "Updated",
        description: `Status changed to ${status}`,
        color: "success",
      });
      fetchLeads(); // Refresh to get updated stats and last_updated_by
    } catch (e: any) {
      addToast({ title: "Error", description: e.message, color: "danger" });
    }
  };

  const handleExport = async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(
        `${config.serverUrl}/api/marketer/leads/export/?format=csv`,
        {
          headers: getAuthHeaders(accessToken),
        },
      );

      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = "marketer_leads.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      addToast({ title: "Error", description: e.message, color: "danger" });
    }
  };

  const handleScrape = (website: string) => {
    // Navigate to the new project page with the website pre-filled
    const fullUrl = website.startsWith("http") ? website : `https://${website}`;

    router.push(`/new?url=${encodeURIComponent(fullUrl)}`);
  };

  const handleView = (domain: string) => {
    router.push(`/project/${domain}`);
  };

  const copyEmail = (lead: Lead) => {
    const text = `Subject: ${lead.generated_email_subject}\n\n${lead.generated_email_body}`;

    navigator.clipboard.writeText(text);
    addToast({
      title: "Copied",
      description: "Email copied to clipboard",
      color: "success",
    });
  };

  // ── Helpers ──
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const formatMoney = (val: number | null) => {
    if (val === null || val === undefined) return "—";

    return `$${val.toLocaleString()}`;
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (next.has(id)) next.delete(id);
      else next.add(id);

      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map((l) => l.id)));
    }
  };

  // ── Render ──

  if (authLoading) {
    return (
      <section className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6 py-8 px-4 w-full max-w-7xl mx-auto">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-divider pb-6">
        <div>
          <h1 className="text-3xl font-bold">Marketer</h1>
          <p className="text-default-500 mt-1">
            Manage leads, generate personalised outreach emails
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            color="primary"
            size="sm"
            variant="solid"
            onPress={() => setAddModalOpen(true)}
          >
            + Add Lead
          </Button>
          <Button
            color="secondary"
            size="sm"
            variant="flat"
            onPress={() => setImportModalOpen(true)}
          >
            Import File
          </Button>
          <Button size="sm" variant="flat" onPress={handleExport}>
            Export CSV
          </Button>
          <Button
            size="sm"
            variant="flat"
            onPress={() => setSettingsOpen(true)}
          >
            ⚙ Settings
          </Button>
        </div>
      </div>

      {/* ── Stats cards ── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <Card className="px-3 py-2">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-default-500">Total</p>
            </div>
          </Card>
          <Card className="px-3 py-2">
            <div className="text-center">
              <p className="text-2xl font-bold text-success">{stats.scraped}</p>
              <p className="text-xs text-default-500">Scraped</p>
            </div>
          </Card>
          <Card className="px-3 py-2">
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">
                {stats.not_scraped}
              </p>
              <p className="text-xs text-default-500">Not Scraped</p>
            </div>
          </Card>
          <Card className="px-3 py-2">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {stats.emails_generated}
              </p>
              <p className="text-xs text-default-500">Emails Ready</p>
            </div>
          </Card>
          <Card className="px-3 py-2">
            <div className="text-center">
              <p className="text-2xl font-bold text-secondary">
                {stats.emails_sent}
              </p>
              <p className="text-xs text-default-500">Sent</p>
            </div>
          </Card>
          <Card className="px-3 py-2">
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">
                {stats.generating}
              </p>
              <p className="text-xs text-default-500">Generating</p>
            </div>
          </Card>
          <Card className="px-3 py-2">
            <div className="text-center">
              <p className="text-2xl font-bold text-danger">{stats.errors}</p>
              <p className="text-xs text-default-500">Errors</p>
            </div>
          </Card>
        </div>
      )}

      {/* ── Search Bar & Toolbar ── */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="flex gap-2 flex-wrap items-center">
          <Input
            isClearable
            className="w-64"
            placeholder="Search website, email, notes…"
            startContent={
              <svg
                className="w-4 h-4 text-default-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            }
            value={searchQuery}
            onClear={() => {
              setSearchQuery("");
              setPage(1);
            }}
            onValueChange={(v) => {
              setSearchQuery(v);
              setPage(1);
            }}
          />
          <Select
            className="w-36"
            label="Status"
            placeholder="All"
            selectedKeys={statusFilter ? [statusFilter] : []}
            size="sm"
            variant="bordered"
            onSelectionChange={(keys: any) => {
              const val = (Array.from(keys)[0] as string) || "";

              setStatusFilter(val);
              setPage(1);
            }}
          >
            <SelectItem key="">All</SelectItem>
            <SelectItem key="new">New</SelectItem>
            <SelectItem key="in_talks">In Talks</SelectItem>
            <SelectItem key="sold">Sold</SelectItem>
            <SelectItem key="generating">Generating</SelectItem>
            <SelectItem key="">All</SelectItem>
            <SelectItem key="email_ready">Email Ready</SelectItem>
            <SelectItem key="email_error">Error</SelectItem>
            <SelectItem key="sent">Sent</SelectItem>
            <SelectItem key="turned_down">Turned Down</SelectItem>
          </Select>
          <Select
            className="w-36"
            label="Scraped"
            placeholder="All"
            selectedKeys={scrapedFilter ? [scrapedFilter] : []}
            size="sm"
            variant="bordered"
            onSelectionChange={(keys: any) => {
              const val = (Array.from(keys)[0] as string) || "";

              setScrapedFilter(val);
              setPage(1);
            }}
          >
            <SelectItem key="">All</SelectItem>
            <SelectItem key="true">Scraped</SelectItem>
            <SelectItem key="false">Not Scraped</SelectItem>
          </Select>
          <Select
            className="w-40"
            label="Last Updated By"
            placeholder="All"
            selectedKeys={filterLastUpdatedBy ? [filterLastUpdatedBy] : []}
            size="sm"
            variant="bordered"
            onSelectionChange={(keys: any) => {
              const val = (Array.from(keys)[0] as string) || "";

              setFilterLastUpdatedBy(val);
              setPage(1);
            }}
          >
            <SelectItem key="">All</SelectItem>
            {/* <SelectItem key="unassigned">Unassigned</SelectItem> */}
            {
              users.map((u) => (
                <SelectItem key={u.id} textValue={u.email}>
                  {u.email}
                </SelectItem>
              )) as any
            }
          </Select>
          <Select
            className="w-36"
            label="Email"
            placeholder="All"
            selectedKeys={emailFilter ? [emailFilter] : []}
            size="sm"
            variant="bordered"
            onSelectionChange={(keys: any) => {
              const val = (Array.from(keys)[0] as string) || "";

              setEmailFilter(val);
              setPage(1);
            }}
          >
            <SelectItem key="">All</SelectItem>
            <SelectItem key="true">Generated</SelectItem>
            <SelectItem key="false">Not Generated</SelectItem>
          </Select>
        </div>
        <div className="flex gap-2 items-center">
          {selectedIds.size > 0 && (
            <>
              <Chip size="sm" variant="flat">
                {selectedIds.size} selected
              </Chip>
              <Button
                color="primary"
                size="sm"
                variant="flat"
                onPress={() => handleGenerateEmail(Array.from(selectedIds))}
              >
                Generate Emails
              </Button>
              <Button
                color="success"
                size="sm"
                variant="flat"
                onPress={() => handleMarkSent(Array.from(selectedIds))}
              >
                Mark Sent
              </Button>
              <Button
                color="danger"
                size="sm"
                variant="flat"
                onPress={() => handleDelete(Array.from(selectedIds))}
              >
                Delete
              </Button>
            </>
          )}
          <Tooltip content="Refresh list">
            <Button
              isIconOnly
              size="sm"
              variant="flat"
              onPress={() => {
                fetchLeads();
                fetchStats();
              }}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </Button>
          </Tooltip>
          <Tooltip content="Check for new scrapes (all leads)">
            <Button
              isIconOnly
              isLoading={refreshing}
              size="sm"
              variant="flat"
              onPress={() => handleRefreshScrape(false)}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="max-h-[600px] overflow-auto rounded-lg">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <Table
            aria-label="Marketer leads table"
            classNames={{ th: "whitespace-nowrap" }}
          >
            <TableHeader>
              <TableColumn>
                <input
                  aria-label="Select all leads"
                  checked={
                    selectedIds.size === leads.length && leads.length > 0
                  }
                  className="cursor-pointer"
                  type="checkbox"
                  onChange={selectAll}
                />
              </TableColumn>
              <TableColumn>
                <button
                  className="flex items-center gap-1 font-semibold"
                  onClick={() => {
                    setSortBy("website");
                    setSortDir(
                      sortBy === "website" && sortDir === "asc"
                        ? "desc"
                        : "asc",
                    );
                  }}
                >
                  LEAD INFO{" "}
                  {sortBy === "website" && (sortDir === "asc" ? "↑" : "↓")}
                </button>
              </TableColumn>
              <TableColumn>CONTACT</TableColumn>
              <TableColumn>
                <button
                  className="flex items-center gap-1 font-semibold"
                  onClick={() => {
                    setSortBy("status");
                    setSortDir(
                      sortBy === "status" && sortDir === "asc" ? "desc" : "asc",
                    );
                  }}
                >
                  STATUS{" "}
                  {sortBy === "status" && (sortDir === "asc" ? "↑" : "↓")}
                </button>
              </TableColumn>
              <TableColumn>FINANCIALS</TableColumn>
              <TableColumn>
                <button
                  className="flex items-center gap-1 font-semibold"
                  onClick={() => {
                    setSortBy("updated_at");
                    setSortDir(
                      sortBy === "updated_at" && sortDir === "asc"
                        ? "desc"
                        : "asc",
                    );
                  }}
                >
                  LAST UPDATE{" "}
                  {sortBy === "updated_at" && (sortDir === "asc" ? "↑" : "↓")}
                </button>
              </TableColumn>
              <TableColumn>NOTES</TableColumn>
              <TableColumn>ACTIONS</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No leads found. Add or import leads to get started.">
              {leads.map((lead) => {
                const statusConf =
                  STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
                const hasEmail = !!lead.generated_email_body;
                const lastUpdater = lead.last_updated_by
                  ? users.find((u) => u.id === lead.last_updated_by)
                  : null;
                const updaterName = lastUpdater
                  ? lastUpdater.email.split("@")[0] || lastUpdater.email
                  : "Unknown";

                return (
                  <TableRow
                    key={lead.id}
                    className={
                      selectedIds.has(lead.id) ? "bg-primary-50/10" : ""
                    }
                  >
                    <TableCell>
                      <input
                        aria-label={`Select ${lead.website}`}
                        checked={selectedIds.has(lead.id)}
                        className="cursor-pointer"
                        type="checkbox"
                        onChange={() => toggleSelect(lead.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <a
                          className="text-primary hover:underline font-medium text-sm truncate max-w-[200px]"
                          href={`https://${lead.website}`}
                          rel="noopener noreferrer"
                          target="_blank"
                          title={lead.website}
                        >
                          {lead.website}
                        </a>
                        <div className="flex gap-1 items-center">
                          {lead.is_scraped ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-950/50 text-green-400 border border-green-900/50">
                              ✓ Scraped
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-default-100/10 text-default-400 border border-default-200/20">
                              Not scraped
                            </span>
                          )}
                          {lead.detected_language && (
                            <span className="text-[10px] text-default-400 uppercase border border-default-200 px-1 rounded">
                              {lead.detected_language}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs gap-0.5 max-w-[150px]">
                        {lead.email ? (
                          <div
                            className="flex items-center gap-1 overflow-hidden"
                            title={lead.email}
                          >
                            <span>📧</span>
                            <span className="truncate">{lead.email}</span>
                          </div>
                        ) : (
                          <span className="text-default-300">No email</span>
                        )}
                        {lead.phone && (
                          <div
                            className="flex items-center gap-1"
                            title={lead.phone}
                          >
                            <span>📞</span>
                            <span>{lead.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        <Dropdown>
                          <DropdownTrigger>
                            <Chip
                              className="cursor-pointer h-6"
                              color={statusConf.color}
                              size="sm"
                              variant="flat"
                            >
                              {statusConf.label} ▾
                            </Chip>
                          </DropdownTrigger>
                          <DropdownMenu
                            aria-label="Update status"
                            onAction={(key) =>
                              handleStatusUpdate(lead.id, key as string)
                            }
                          >
                            {Object.entries(STATUS_CONFIG).map(([k, c]) => (
                              <DropdownItem key={k} color={c.color}>
                                {c.label}
                              </DropdownItem>
                            ))}
                          </DropdownMenu>
                        </Dropdown>

                        {lead.email_sent ? (
                          <span className="text-[10px] text-primary font-medium px-1">
                            ✓ Sent
                          </span>
                        ) : hasEmail ? (
                          <span className="text-[10px] text-success font-medium px-1">
                            Ready
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs">
                        <div className="flex justify-between gap-2 min-w-[80px]">
                          <span className="text-default-400">Profit:</span>
                          <span className="font-medium">
                            {formatMoney(lead.net_profit)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2 min-w-[80px]">
                          <span className="text-default-400">Rev:</span>
                          <span className="font-medium">
                            {formatMoney(lead.sales_revenue)}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-[10px] leading-tight text-default-500">
                        <span className="whitespace-nowrap">
                          {formatDate(lead.updated_at)}
                        </span>
                        {lastUpdater && (
                          <span
                            className="text-default-400 truncate max-w-[80px]"
                            title={lastUpdater.email}
                          >
                            by {updaterName}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-default-500 max-w-[150px] truncate inline-block">
                        {lead.notes || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 items-center">
                        {/* Scrape / Generate Email button */}
                        {!lead.is_scraped ? (
                          <Tooltip content="Scrape this website first">
                            <Button
                              color="warning"
                              size="sm"
                              variant="flat"
                              onPress={() => handleScrape(lead.website)}
                            >
                              Scrape
                            </Button>
                          </Tooltip>
                        ) : !hasEmail ? (
                          <Tooltip content="Generate personalised email">
                            <Button
                              color="primary"
                              isDisabled={lead.status === "generating"}
                              size="sm"
                              variant="flat"
                              onPress={() => handleGenerateEmail([lead.id])}
                            >
                              {lead.status === "generating" ? (
                                <Spinner size="sm" />
                              ) : (
                                "Generate Email"
                              )}
                            </Button>
                          </Tooltip>
                        ) : (
                          <Tooltip content="View generated email">
                            <Button
                              color="success"
                              size="sm"
                              variant="flat"
                              onPress={() => {
                                setViewingEmail(lead);
                                setEmailViewOpen(true);
                              }}
                            >
                              View Email
                            </Button>
                          </Tooltip>
                        )}
                        {/* View project (if scraped) */}
                        {lead.is_scraped && lead.scraped_domain && (
                          <Tooltip content="View scraped project">
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              onPress={() => handleView(lead.scraped_domain!)}
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                />
                                <path
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                />
                              </svg>
                            </Button>
                          </Tooltip>
                        )}
                        {/* More actions */}
                        <Dropdown>
                          <DropdownTrigger>
                            <Button isIconOnly size="sm" variant="light">
                              <svg
                                fill="none"
                                height="16"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                                width="16"
                              >
                                <circle cx="12" cy="5" r="1" />
                                <circle cx="12" cy="12" r="1" />
                                <circle cx="12" cy="19" r="1" />
                              </svg>
                            </Button>
                          </DropdownTrigger>
                          <DropdownMenu
                            aria-label="Lead actions"
                            items={[
                              { key: "edit", label: "Edit Lead" },
                              ...(hasEmail
                                ? [{ key: "copy", label: "Copy Email" }]
                                : []),
                              ...(hasEmail
                                ? [
                                    {
                                      key: "regenerate",
                                      label: "Regenerate Email",
                                    },
                                  ]
                                : []),
                              ...(hasEmail && !lead.email_sent
                                ? [{ key: "mark-sent", label: "Mark as Sent" }]
                                : []),
                              ...(!lead.is_scraped
                                ? [{ key: "scrape", label: "Scrape Website" }]
                                : []),
                              { key: "delete", label: "Delete" },
                            ]}
                            onAction={(key) => {
                              switch (key) {
                                case "edit":
                                  setEditLead({ ...lead });
                                  setEditModalOpen(true);
                                  break;
                                case "copy":
                                  copyEmail(lead);
                                  break;
                                case "regenerate":
                                  handleRegenerateEmail(lead.id);
                                  break;
                                case "mark-sent":
                                  handleMarkSent([lead.id]);
                                  break;
                                case "scrape":
                                  handleScrape(lead.website);
                                  break;
                                case "delete":
                                  handleDelete([lead.id]);
                                  break;
                              }
                            }}
                          >
                            {(item) => (
                              <DropdownItem
                                key={item.key}
                                className={
                                  item.key === "delete" ? "text-danger" : ""
                                }
                                color={
                                  item.key === "delete" ? "danger" : "default"
                                }
                              >
                                {item.label}
                              </DropdownItem>
                            )}
                          </DropdownMenu>
                        </Dropdown>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            showControls
            page={page}
            total={totalPages}
            onChange={(p) => setPage(p)}
          />
        </div>
      )}
      <p className="text-center text-sm text-default-400">
        Showing {leads.length} of {total} leads
      </p>

      {/* ═══════════ MODALS ═══════════ */}

      {/* ── Add Lead Modal ── */}
      <Modal
        isOpen={addModalOpen}
        size="lg"
        onClose={() => setAddModalOpen(false)}
      >
        <ModalContent>
          <ModalHeader>Add Lead</ModalHeader>
          <ModalBody>
            <div className="flex flex-col gap-3">
              <Input
                isRequired
                label="Website"
                placeholder="example.com"
                value={newLead.website}
                variant="bordered"
                onValueChange={(v) => setNewLead((p) => ({ ...p, website: v }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Email"
                  placeholder="contact@example.com"
                  value={newLead.email}
                  variant="bordered"
                  onValueChange={(v) => setNewLead((p) => ({ ...p, email: v }))}
                />
                <Input
                  label="Phone / Number"
                  placeholder="+1234567890"
                  value={newLead.phone}
                  variant="bordered"
                  onValueChange={(v) => setNewLead((p) => ({ ...p, phone: v }))}
                />
              </div>
              <Textarea
                label="Notes"
                placeholder="Any notes about this lead..."
                value={newLead.notes}
                variant="bordered"
                onValueChange={(v) => setNewLead((p) => ({ ...p, notes: v }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Net Profit"
                  placeholder="0.00"
                  type="number"
                  value={newLead.net_profit}
                  variant="bordered"
                  onValueChange={(v) =>
                    setNewLead((p) => ({ ...p, net_profit: v }))
                  }
                />
                <Input
                  label="Sales Revenue"
                  placeholder="0.00"
                  type="number"
                  value={newLead.sales_revenue}
                  variant="bordered"
                  onValueChange={(v) =>
                    setNewLead((p) => ({ ...p, sales_revenue: v }))
                  }
                />
              </div>
              <p className="text-xs text-default-400">
                Either email or phone is required.
              </p>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              color="primary"
              isDisabled={
                !newLead.website || (!newLead.email && !newLead.phone)
              }
              onPress={handleAddLead}
            >
              Add Lead
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── Import Modal ── */}
      <Modal
        isOpen={importModalOpen}
        size="md"
        onClose={() => setImportModalOpen(false)}
      >
        <ModalContent>
          <ModalHeader>Import Leads from File</ModalHeader>
          <ModalBody>
            <div className="flex flex-col gap-4">
              <div className="border-2 border-dashed border-default-300 rounded-xl p-8 text-center">
                <input
                  ref={fileInputRef}
                  accept=".csv,.xlsx,.xls"
                  aria-label="Upload leads file"
                  className="hidden"
                  type="file"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setImportFile(e.target.files[0]);
                  }}
                />
                {importFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <Chip color="success" variant="flat">
                      📄 {importFile.name}
                    </Chip>
                    <Button
                      size="sm"
                      variant="light"
                      onPress={() => {
                        setImportFile(null);
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <svg
                      className="w-10 h-10 text-default-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                    <p className="text-default-500">
                      Drop a file here or click to browse
                    </p>
                    <Button
                      size="sm"
                      variant="flat"
                      onPress={() => fileInputRef.current?.click()}
                    >
                      Choose File
                    </Button>
                  </div>
                )}
              </div>
              <Card className="bg-content2">
                <CardBody className="py-3">
                  <p className="text-sm font-medium mb-1">Required columns:</p>
                  <p className="text-xs text-default-500">
                    <code>website</code> + (<code>email</code> or{" "}
                    <code>phone</code>/<code>number</code>)
                  </p>
                  <p className="text-sm font-medium mb-1 mt-2">
                    Optional columns:
                  </p>
                  <p className="text-xs text-default-500">
                    <code>notes</code>, <code>net_profit</code>,{" "}
                    <code>sales_revenue</code>
                  </p>
                  <p className="text-xs text-default-400 mt-2">
                    Supported formats: .csv, .xlsx, .xls
                  </p>
                </CardBody>
              </Card>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setImportModalOpen(false)}>
              Cancel
            </Button>
            <Button
              color="primary"
              isDisabled={!importFile}
              isLoading={importing}
              onPress={handleImport}
            >
              Import
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── View Email Modal ── */}
      <Modal
        isOpen={emailViewOpen}
        scrollBehavior="inside"
        size="2xl"
        onClose={() => setEmailViewOpen(false)}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <span>Generated Email</span>
                <div className="text-sm text-default-500 font-normal">
                  For: {viewingEmail?.website}
                  {viewingEmail?.detected_language && (
                    <Chip className="ml-2" size="sm" variant="flat">
                      {viewingEmail.detected_language.toUpperCase()}
                    </Chip>
                  )}
                  {viewingEmail?.email_model && (
                    <Chip
                      className="ml-2"
                      color="secondary"
                      size="sm"
                      variant="flat"
                    >
                      {viewingEmail.email_model}
                    </Chip>
                  )}
                </div>
              </ModalHeader>
              <ModalBody>
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-sm font-semibold text-default-500 mb-1">
                      Subject:
                    </p>
                    <p className="text-lg font-medium">
                      {viewingEmail?.generated_email_subject || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-default-500 mb-1">
                      Body:
                    </p>
                    <Card className="bg-content2">
                      <CardBody>
                        <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">
                          {viewingEmail?.generated_email_body || "—"}
                        </pre>
                      </CardBody>
                    </Card>
                  </div>
                  {viewingEmail?.email_generated_at && (
                    <p className="text-xs text-default-400">
                      Generated: {formatDate(viewingEmail.email_generated_at)}
                    </p>
                  )}
                  {viewingEmail?.email && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-default-500">To:</span>
                      <Chip size="sm" variant="flat">
                        {viewingEmail.email}
                      </Chip>
                    </div>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Close
                </Button>
                {viewingEmail && (
                  <Button
                    color="secondary"
                    variant="flat"
                    onPress={() => handleRegenerateEmail(viewingEmail.id)}
                  >
                    Regenerate
                  </Button>
                )}
                {viewingEmail && (
                  <Button
                    color="primary"
                    variant="flat"
                    onPress={() => copyEmail(viewingEmail)}
                  >
                    Copy Email
                  </Button>
                )}
                {viewingEmail && !viewingEmail.email_sent && (
                  <Button
                    color="success"
                    onPress={() => {
                      handleMarkSent([viewingEmail.id]);
                      setEmailViewOpen(false);
                    }}
                  >
                    Mark as Sent
                  </Button>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ── Edit Lead Modal ── */}
      <Modal
        isOpen={editModalOpen}
        size="lg"
        onClose={() => setEditModalOpen(false)}
      >
        <ModalContent>
          <ModalHeader>Edit Lead</ModalHeader>
          <ModalBody>
            {editLead && (
              <div className="flex flex-col gap-3">
                <Input
                  label="Website"
                  value={editLead.website}
                  variant="bordered"
                  onValueChange={(v) =>
                    setEditLead((p) => (p ? { ...p, website: v } : p))
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Email"
                    value={editLead.email || ""}
                    variant="bordered"
                    onValueChange={(v) =>
                      setEditLead((p) => (p ? { ...p, email: v || null } : p))
                    }
                  />
                  <Input
                    label="Phone"
                    value={editLead.phone || ""}
                    variant="bordered"
                    onValueChange={(v) =>
                      setEditLead((p) => (p ? { ...p, phone: v || null } : p))
                    }
                  />
                </div>
                <Textarea
                  label="Notes"
                  value={editLead.notes || ""}
                  variant="bordered"
                  onValueChange={(v) =>
                    setEditLead((p) => (p ? { ...p, notes: v || null } : p))
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Net Profit"
                    type="number"
                    value={String(editLead.net_profit ?? "")}
                    variant="bordered"
                    onValueChange={(v) =>
                      setEditLead((p) =>
                        p ? { ...p, net_profit: v ? parseFloat(v) : null } : p,
                      )
                    }
                  />
                  <Input
                    label="Sales Revenue"
                    type="number"
                    value={String(editLead.sales_revenue ?? "")}
                    variant="bordered"
                    onValueChange={(v) =>
                      setEditLead((p) =>
                        p
                          ? { ...p, sales_revenue: v ? parseFloat(v) : null }
                          : p,
                      )
                    }
                  />
                </div>
                <Select
                  label="Status"
                  selectedKeys={[editLead.status]}
                  variant="bordered"
                  onSelectionChange={(keys: any) => {
                    const val = Array.from(keys)[0] as string;

                    setEditLead((p) => (p ? { ...p, status: val } : p));
                  }}
                >
                  <SelectItem key="new">New</SelectItem>
                  <SelectItem key="generating">Generating</SelectItem>
                  <SelectItem key="email_ready">Email Ready</SelectItem>
                  <SelectItem key="email_error">Error</SelectItem>
                  <SelectItem key="sent">Sent</SelectItem>
                  <SelectItem key="in_talks">In Talks</SelectItem>
                  <SelectItem key="sold">Sold</SelectItem>
                  <SelectItem key="turned_down">Turned Down</SelectItem>
                </Select>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button color="primary" onPress={handleEditSave}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── Settings Modal ── */}
      <Modal
        isOpen={settingsOpen}
        scrollBehavior="inside"
        size="4xl"
        onClose={() => setSettingsOpen(false)}
      >
        <ModalContent>
          <ModalHeader>Marketer Settings</ModalHeader>
          <ModalBody>
            <div className="flex flex-col gap-4">
              <Input
                description="The AI model used to generate outreach emails (e.g. gemini-2.5-flash, gpt-4o)"
                label="AI Model"
                value={settings.ai_model}
                variant="bordered"
                onValueChange={(v) =>
                  setSettings((p) => ({ ...p, ai_model: v }))
                }
              />
              <Textarea
                disableAnimation
                disableAutosize
                classNames={{
                  base: "max-w-full",
                  input: "min-h-[400px]",
                }}
                description="Full custom prompt template for the AI copywriter. Use placeholders {website}, {email}, {notes_section}, {revenue_section}, {site_context}, {demo_link_section}, {demo_instruction}, {intro_instruction}, {footer_instruction}."
                label="Custom Prompt Template"
                // minRows={15} // HeroUI Textarea doesn't support minRows prop correctly sometimes, using class height instead
                placeholder="Paste your full prompt here..."
                value={settings.custom_prompt_instructions || ""}
                variant="bordered"
                onValueChange={(v) =>
                  setSettings((p) => ({ ...p, custom_prompt_instructions: v }))
                }
              />
              <Input
                description="Base URL for the demo page (e.g. https://app.cartbuddy.ai). Leave empty to exclude demo link."
                label="Demo Base URL"
                placeholder="https://app.cartbuddy.ai"
                value={settings.demo_base_url}
                variant="bordered"
                onValueChange={(v) =>
                  setSettings((p) => ({ ...p, demo_base_url: v }))
                }
              />
              <Textarea
                description="Optional intro text the AI should include at the start of every email"
                label="Email Template — Intro"
                placeholder="Hi {{name}},..."
                value={settings.email_template_intro}
                variant="bordered"
                onValueChange={(v) =>
                  setSettings((p) => ({ ...p, email_template_intro: v }))
                }
              />
              <Textarea
                description="Optional footer text the AI should include at the end of every email"
                label="Email Template — Footer"
                placeholder="Best regards, ..."
                value={settings.email_template_footer}
                variant="bordered"
                onValueChange={(v) =>
                  setSettings((p) => ({ ...p, email_template_footer: v }))
                }
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setSettingsOpen(false)}>
              Cancel
            </Button>
            <Button color="primary" onPress={handleSaveSettings}>
              Save Settings
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </section>
  );
}
