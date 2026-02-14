"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Input } from "@heroui/input";
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
import { Checkbox } from "@heroui/checkbox";
import { addToast } from "@heroui/toast";
import { useAuth } from "@/app/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { config } from "@/lib/config";
import { getAuthHeaders } from "@/app/utils/apiHelper";

interface UserItem {
  id: string;
  email: string;
  role: string;
  created_at: string;
  project_count: number;
  projects: string[];
  refine_ai_daily_limit: number;
}

interface UserDetail {
  user: {
    id: string;
    email: string;
    role: string;
    created_at: string;
    refine_ai_daily_limit: number;
    refine_ai_count: number;
    refine_ai_last_reset: string | null;
  };
  projects: Array<{
    domain: string;
    interactions: number;
    widget_opens: number;
    sessions: number;
  }>;
  total_metrics: {
    total_interactions: number;
    total_widget_opens: number;
    total_sessions: number;
  };
}

export default function UsersPage() {
  const { isAuthenticated, isSuperAdmin, isLoading: authLoading, accessToken } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [allDomains, setAllDomains] = useState<string[]>([]);

  // Modal states
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState<string>("");
  const [assignDomains, setAssignDomains] = useState<string[]>([]);
  const [assignSearch, setAssignSearch] = useState<string>("");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserItem | null>(null);
  const [editRole, setEditRole] = useState<string>("user");
  const [editLimit, setEditLimit] = useState<number>(3);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortDescriptor, setSortDescriptor] = useState({
    column: "created_at",
    direction: "descending",
  });

  const filteredUsers = useMemo(() => {
    let result = [...users];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          u.projects.some((p) => p.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      const first = a[sortDescriptor.column as keyof UserItem];
      const second = b[sortDescriptor.column as keyof UserItem];
      let cmp = 0;

      if (sortDescriptor.column === "projects") {
          // Sort by project count
          cmp = a.projects.length - b.projects.length;
      } else if (sortDescriptor.column === "ai_limit") {
          cmp = a.refine_ai_daily_limit - b.refine_ai_daily_limit;
      } else {
        cmp = (first as string) < (second as string) ? -1 : (first as string) > (second as string) ? 1 : 0;
      }

      return sortDescriptor.direction === "descending" ? -cmp : cmp;
    });

    return result;
  }, [users, searchQuery, sortDescriptor]);

  const fetchUsers = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${config.serverUrl}/api/users/`, {
        headers: getAuthHeaders(accessToken),
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e: any) {
      addToast({ title: "Error", description: e.message, color: "danger" });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchAllDomains = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${config.serverUrl}/api/users/projects/`, {
        headers: getAuthHeaders(accessToken),
      });
      if (res.ok) {
        const data = await res.json();
        setAllDomains(data.domains || []);
      }
    } catch (e) {
      console.error("Failed to fetch domains", e);
    }
  }, [accessToken]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !isSuperAdmin) {
      router.replace("/");
      return;
    }
    fetchUsers();
    fetchAllDomains();
  }, [authLoading, isAuthenticated, isSuperAdmin, router, fetchUsers, fetchAllDomains]);

  const openDetail = async (userId: string) => {
    if (!accessToken) return;
    setDetailLoading(true);
    setDetailModalOpen(true);
    try {
      const res = await fetch(`${config.serverUrl}/api/users/${userId}/`, {
        headers: getAuthHeaders(accessToken),
      });
      if (!res.ok) throw new Error("Failed to fetch user details");
      const data = await res.json();
      setSelectedUser(data);
    } catch (e: any) {
      addToast({ title: "Error", description: e.message, color: "danger" });
      setDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const openEdit = (user: UserItem) => {
    setEditUser(user);
    setEditRole(user.role);
    setEditLimit(user.refine_ai_daily_limit);
    setEditModalOpen(true);
  };

  const saveEdit = async () => {
    if (!accessToken || !editUser) return;
    try {
      const res = await fetch(`${config.serverUrl}/api/users/${editUser.id}/update/`, {
        method: "PUT",
        headers: getAuthHeaders(accessToken),
        body: JSON.stringify({ role: editRole, refine_ai_daily_limit: editLimit }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Update failed");
      }
      addToast({ title: "Success", description: "User updated", color: "success" });
      setEditModalOpen(false);
      fetchUsers();
    } catch (e: any) {
      addToast({ title: "Error", description: e.message, color: "danger" });
    }
  };

  const openAssign = (userId: string) => {
    setAssignUserId(userId);
    setAssignDomains([]);
    setAssignSearch("");
    setAssignModalOpen(true);
  };

  const assignProject = async () => {
    if (!accessToken || !assignUserId || assignDomains.length === 0) return;
    try {
      const res = await fetch(`${config.serverUrl}/api/users/assign-project/`, {
        method: "POST",
        headers: getAuthHeaders(accessToken),
        body: JSON.stringify({ user_id: assignUserId, domains: assignDomains }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Assignment failed");
      }
      addToast({ title: "Success", description: `Project assigned`, color: "success" });
      setAssignModalOpen(false);
      fetchUsers();
    } catch (e: any) {
      addToast({ title: "Error", description: e.message, color: "danger" });
    }
  };

  const unassignProject = async (userId: string, domain: string) => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${config.serverUrl}/api/users/unassign-project/`, {
        method: "DELETE",
        headers: getAuthHeaders(accessToken),
        body: JSON.stringify({ user_id: userId, domain }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Unassignment failed");
      }
      addToast({ title: "Success", description: `Project unassigned`, color: "success" });
      // Refresh detail if open
      if (selectedUser && selectedUser.user.id === userId) {
        openDetail(userId);
      }
      fetchUsers();
    } catch (e: any) {
      addToast({ title: "Error", description: e.message, color: "danger" });
    }
  };

  const deleteUser = async (userId: string) => {
    if (!accessToken) return;
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      const res = await fetch(`${config.serverUrl}/api/users/${userId}/delete/`, {
        method: "DELETE",
        headers: getAuthHeaders(accessToken),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Delete failed");
      }
      addToast({ title: "Success", description: "User deleted", color: "success" });
      fetchUsers();
    } catch (e: any) {
      addToast({ title: "Error", description: e.message, color: "danger" });
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  if (authLoading || loading) {
    return (
      <section className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6 py-8 px-4 w-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-divider pb-6">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-default-500 mt-1">
            Manage users, roles, and project assignments
          </p>
        </div>
        <div className="flex gap-3">
          <Card className="px-4 py-2">
            <div className="text-center">
              <p className="text-2xl font-bold">{users.length}</p>
              <p className="text-xs text-default-500">Total Users</p>
            </div>
          </Card>
          <Card className="px-4 py-2">
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">
                {users.filter((u) => u.role === "super_admin").length}
              </p>
              <p className="text-xs text-default-500">Admins</p>
            </div>
          </Card>
          <Card className="px-4 py-2">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {users.filter((u) => u.role === "user").length}
              </p>
              <p className="text-xs text-default-500">Users</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Users Table */}
      <div className="flex justify-between items-center mb-4">
        <Input
          placeholder="Search by email or project..."
          value={searchQuery}
          onValueChange={setSearchQuery}
          className="max-w-xs"
          startContent={
            <svg className="w-4 h-4 text-default-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
        />
        <div className="text-default-400 text-small">
          Total {users.length} users
        </div>
      </div>

      <Card>
        <CardBody className="p-0">
          <Table 
            aria-label="Users table" 
            removeWrapper
            sortDescriptor={sortDescriptor as any}
            onSortChange={(descriptor: any) => setSortDescriptor(descriptor)}
          >
            <TableHeader>
              <TableColumn key="email" allowsSorting>EMAIL</TableColumn>
              <TableColumn key="role" allowsSorting>ROLE</TableColumn>
              <TableColumn key="projects" allowsSorting>PROJECTS</TableColumn>
              <TableColumn key="ai_limit" allowsSorting>AI LIMIT</TableColumn>
              <TableColumn key="created_at" allowsSorting>JOINED</TableColumn>
              <TableColumn key="actions">ACTIONS</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No users found" items={filteredUsers}>
              {(user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <button
                      onClick={() => openDetail(user.id)}
                      className="text-primary hover:underline font-medium text-left"
                    >
                      {user.email}
                    </button>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="sm"
                      color={user.role === "super_admin" ? "warning" : "default"}
                      variant="flat"
                    >
                      {user.role === "super_admin" ? "Admin" : "User"}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.projects.length === 0 ? (
                        <span className="text-default-400 text-sm">None</span>
                      ) : (
                        <>
                          {user.projects.slice(0, 3).map((d) => (
                            <Chip key={d} size="sm" variant="flat">
                              {d}
                            </Chip>
                          ))}
                          {user.projects.length > 3 && (
                            <Chip size="sm" variant="flat" color="default">
                              +{user.projects.length - 3} more
                            </Chip>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {user.role === "super_admin" ? "∞" : `${user.refine_ai_daily_limit}/day`}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-default-500">
                      {formatDate(user.created_at)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Dropdown>
                      <DropdownTrigger>
                        <Button variant="light" size="sm" isIconOnly>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="5" r="1" />
                            <circle cx="12" cy="12" r="1" />
                            <circle cx="12" cy="19" r="1" />
                          </svg>
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu aria-label="User actions">
                        <DropdownItem key="view" onPress={() => openDetail(user.id)}>
                          View Details
                        </DropdownItem>
                        <DropdownItem key="edit" onPress={() => openEdit(user)}>
                          Edit User
                        </DropdownItem>
                        <DropdownItem key="assign" onPress={() => openAssign(user.id)}>
                          Assign Project
                        </DropdownItem>
                        <DropdownItem
                          key="delete"
                          className="text-danger"
                          color="danger"
                          onPress={() => deleteUser(user.id)}
                        >
                          Delete User
                        </DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {/* ─── Detail Modal ─── */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        size="3xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          {detailLoading || !selectedUser ? (
            <ModalBody className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </ModalBody>
          ) : (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <span>{selectedUser.user.email}</span>
                  <Chip
                    size="sm"
                    color={selectedUser.user.role === "super_admin" ? "warning" : "default"}
                    variant="flat"
                  >
                    {selectedUser.user.role === "super_admin" ? "Admin" : "User"}
                  </Chip>
                </div>
                <p className="text-sm text-default-500 font-normal">
                  Joined {formatDate(selectedUser.user.created_at)}
                </p>
              </ModalHeader>
              <ModalBody>
                {/* Metrics Summary */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <Card className="bg-content2">
                    <CardBody className="text-center py-3">
                      <p className="text-2xl font-bold">{selectedUser.total_metrics.total_interactions}</p>
                      <p className="text-xs text-default-500">Total Interactions</p>
                    </CardBody>
                  </Card>
                  <Card className="bg-content2">
                    <CardBody className="text-center py-3">
                      <p className="text-2xl font-bold">{selectedUser.total_metrics.total_widget_opens}</p>
                      <p className="text-xs text-default-500">Widget Opens</p>
                    </CardBody>
                  </Card>
                  <Card className="bg-content2">
                    <CardBody className="text-center py-3">
                      <p className="text-2xl font-bold">{selectedUser.total_metrics.total_sessions}</p>
                      <p className="text-xs text-default-500">Sessions</p>
                    </CardBody>
                  </Card>
                </div>

                {/* AI Usage */}
                {selectedUser.user.role !== "super_admin" && (
                  <Card className="mb-6 bg-content2">
                    <CardBody className="py-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium">Refine with AI Usage</p>
                          <p className="text-xs text-default-500">
                            {selectedUser.user.refine_ai_count} / {selectedUser.user.refine_ai_daily_limit} used today
                          </p>
                        </div>
                        <Chip size="sm" color={selectedUser.user.refine_ai_count >= selectedUser.user.refine_ai_daily_limit ? "danger" : "success"} variant="flat">
                          {selectedUser.user.refine_ai_count >= selectedUser.user.refine_ai_daily_limit ? "Limit Reached" : "Available"}
                        </Chip>
                      </div>
                    </CardBody>
                  </Card>
                )}

                {/* Projects */}
                <h3 className="font-semibold mb-3">Assigned Projects</h3>
                {selectedUser.projects.length === 0 ? (
                  <p className="text-default-400 text-sm mb-4">No projects assigned</p>
                ) : (
                  <div className="space-y-2 mb-4">
                    {selectedUser.projects.map((p) => (
                      <Card key={p.domain} className="bg-content2">
                        <CardBody className="py-2 px-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-sm">{p.domain}</p>
                              <p className="text-xs text-default-500">
                                {p.interactions} interactions · {p.widget_opens} opens · {p.sessions} sessions
                              </p>
                            </div>
                            <Button
                              size="sm"
                              color="danger"
                              variant="light"
                              onPress={() => unassignProject(selectedUser.user.id, p.domain)}
                            >
                              Remove
                            </Button>
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                )}
                <Button
                  size="sm"
                  color="primary"
                  variant="flat"
                  onPress={() => {
                    setDetailModalOpen(false);
                    openAssign(selectedUser.user.id);
                  }}
                >
                  + Assign Project
                </Button>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={() => setDetailModalOpen(false)}>
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ─── Edit Modal ─── */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} size="md">
        <ModalContent>
          <ModalHeader>Edit User</ModalHeader>
          <ModalBody>
            {editUser && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-default-500">{editUser.email}</p>
                <div>
                  <label className="text-sm font-medium mb-1 block">Role</label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      color={editRole === "user" ? "primary" : "default"}
                      variant={editRole === "user" ? "solid" : "bordered"}
                      onPress={() => setEditRole("user")}
                    >
                      User
                    </Button>
                    <Button
                      size="sm"
                      color={editRole === "super_admin" ? "warning" : "default"}
                      variant={editRole === "super_admin" ? "solid" : "bordered"}
                      onPress={() => setEditRole("super_admin")}
                    >
                      Admin
                    </Button>
                  </div>
                </div>
                {editRole === "user" && (
                  <Input
                    label="Daily AI Refine Limit"
                    type="number"
                    min={0}
                    value={String(editLimit)}
                    onValueChange={(v) => setEditLimit(parseInt(v) || 0)}
                    variant="bordered"
                    description="How many times per day the user can use 'Refine with AI'"
                  />
                )}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button color="primary" onPress={saveEdit}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ─── Assign Project Modal ─── */}
      <Modal isOpen={assignModalOpen} onClose={() => setAssignModalOpen(false)} size="md">
        <ModalContent>
          <ModalHeader>Assign Project</ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-500 mb-2">
              Select a project to assign to this user
            </p>
            <Input
              autoFocus
              label="Search Project"
              placeholder="Type to filter..."
              value={assignSearch}
              onValueChange={setAssignSearch}
              variant="bordered"
              className="mb-2"
              isClearable
              onClear={() => setAssignSearch("")}
            />
            <div className="flex flex-col gap-1 max-h-64 overflow-y-auto pr-2">
              {allDomains.filter((d) => 
                d.toLowerCase().includes(assignSearch.toLowerCase())
              ).length === 0 ? (
                <p className="text-default-400 text-sm py-4 text-center">No matching projects found</p>
              ) : (
                allDomains
                  .filter((d) => d.toLowerCase().includes(assignSearch.toLowerCase()))
                  .map((domain) => {
                    const isSelected = assignDomains.includes(domain);
                    return (
                      <div
                        key={domain}
                        className={`flex items-center px-4 py-2 cursor-pointer hover:bg-default-100 rounded-lg transition-colors ${isSelected ? "bg-primary-50" : ""}`}
                        onClick={() => {
                          setAssignDomains((prev) => 
                            isSelected ? prev.filter((d) => d !== domain) : [...prev, domain]
                          );
                        }}
                      >
                        <Checkbox 
                            isSelected={isSelected} 
                            onValueChange={() => {}} // Controlled by div click
                            classNames={{ base: "pointer-events-none" }}
                        >
                            {domain}
                        </Checkbox>
                      </div>
                    );
                  })
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button
              color="primary"
              isDisabled={assignDomains.length === 0}
              onPress={assignProject}
            >
              Assign {assignDomains.length > 0 && `(${assignDomains.length})`}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </section>
  );
}
