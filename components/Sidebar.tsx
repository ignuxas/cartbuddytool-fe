"use client";
import { useState } from "react";
import NextLink from "next/link";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/dropdown";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  MessageSquare,
  Users,
  LineChart,
  Settings,
  LogOut,
  Globe,
  ChevronDown,
  FolderOpen,
  ChevronRight,
  ChevronLeft,
  CreditCard,
} from "lucide-react";
import { addToast } from "@heroui/toast";
import { useEffect } from "react";

import { useAuth } from "@/app/contexts/AuthContext";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { useProjectsList } from "@/app/utils/swr";
import { config } from "@/lib/config";
import { makeApiCall, getAuthHeaders } from "@/app/utils/apiHelper";

export const Sidebar = () => {
  const { isAuthenticated, isSuperAdmin, user, logout, accessToken } =
    useAuth();
  const { t, language, setLanguage } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();

  const [isProjectsOpen, setIsProjectsOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(pathname === "/login");

  useEffect(() => {
    if (pathname === "/login") {
      setIsCollapsed(true);
    }
  }, [pathname]);

  // Fetch projects data
  const { projects: rawProjects } = useProjectsList(
    isAuthenticated && accessToken ? accessToken : null,
  );

  const ignoredProjects = [
    "widget.events",
    "users",
    "user.projects",
    "site.settings",
    "marketer.leads",
    "marketer.settings",
  ];
  const projects = (rawProjects || []).filter(
    (p: { domain: string }) => !ignoredProjects.includes(p.domain),
  );

  const navLinkClass = (isActive: boolean) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
      isActive
        ? "bg-primary/10 text-primary"
        : "text-default-500 hover:text-foreground hover:bg-default-100/50"
    } ${isCollapsed ? "justify-center px-0" : ""}`;

  const getInitials = (email?: string) => {
    if (!email) return "U";

    return email.substring(0, 2).toUpperCase();
  };

  const handleManageBilling = async () => {
    if (!user?.stripe_customer_id) {
      addToast({
        title: t("common.error") || "Error",
        description: t("billing.noSubscription") || "No active subscription.",
        color: "warning",
      });
      router.push("/pricing");

      return;
    }
    try {
      const data = await makeApiCall(
        `${config.serverUrl}/api/stripe/create-portal-session/`,
        {
          method: "POST",
          headers: getAuthHeaders(accessToken),
        },
        "ManageBilling",
      );

      window.location.href = data.portal_url;
    } catch (e: any) {
      addToast({
        title: t("common.error") || "Error",
        description:
          e?.message || t("billing.portalError") || "Error opening portal",
        color: "danger",
      });
    }
  };

  return (
    <aside
      className={`h-full border-r border-default-200 bg-background hidden md:flex flex-col justify-between transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        <div
          className={`p-4 flex ${isCollapsed ? "flex-col items-center gap-4" : "items-center justify-between"}`}
        >
          {!isCollapsed && (
            <NextLink
              className="flex justify-start items-center gap-2"
              href="/"
            >
              <img
                alt="Logo"
                className="w-8 h-8 rounded-full object-cover"
                src="/avatar.jpg"
              />
              <p className="font-bold text-inherit text-xl truncate">
                {t("common.appName")}
              </p>
            </NextLink>
          )}
          {isCollapsed && (
            <NextLink className="flex justify-center items-center" href="/">
              <img
                alt="Logo"
                className="w-8 h-8 rounded-full object-cover"
                src="/avatar.jpg"
              />
            </NextLink>
          )}
          <Button
            isIconOnly
            size="sm"
            variant="light"
            onPress={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <ChevronRight size={18} />
            ) : (
              <ChevronLeft size={18} />
            )}
          </Button>
        </div>

        <nav
          className={`flex flex-col gap-1 mt-2 ${isCollapsed ? "px-2" : "px-4"}`}
        >
          {isAuthenticated && (
            <NextLink
              className={navLinkClass(pathname === "/")}
              href="/"
              title={isCollapsed ? t("common.dashboard") : undefined}
            >
              <LayoutDashboard size={18} />
              {!isCollapsed && t("common.dashboard")}
            </NextLink>
          )}

          {isAuthenticated && isSuperAdmin && (
            <>
              <NextLink
                className={navLinkClass(pathname === "/new")}
                href="/new"
                title={isCollapsed ? t("common.newProject") : undefined}
              >
                <PlusCircle size={18} />
                {!isCollapsed && t("common.newProject")}
              </NextLink>
              <NextLink
                className={navLinkClass(pathname === "/prompts")}
                href="/prompts"
                title={isCollapsed ? t("common.prompts") : undefined}
              >
                <MessageSquare size={18} />
                {!isCollapsed && t("common.prompts")}
              </NextLink>
              <NextLink
                className={navLinkClass(pathname === "/users")}
                href="/users"
                title={isCollapsed ? t("common.users") : undefined}
              >
                <Users size={18} />
                {!isCollapsed && t("common.users")}
              </NextLink>
              <NextLink
                className={navLinkClass(pathname === "/marketer")}
                href="/marketer"
                title={isCollapsed ? t("common.marketer") : undefined}
              >
                <LineChart size={18} />
                {!isCollapsed && t("common.marketer")}
              </NextLink>
            </>
          )}

          {isAuthenticated && projects.length > 0 && (
            <div className="mt-2 flex flex-col gap-1">
              <button
                className={`flex items-center ${isCollapsed ? "justify-center px-0" : "justify-between px-3"} py-2 w-full rounded-lg transition-colors text-sm font-medium text-default-600 hover:text-foreground hover:bg-default-100/50 focus:outline-none`}
                title={
                  isCollapsed ? t("common.projects") || "Projects" : undefined
                }
                onClick={() => setIsProjectsOpen(!isProjectsOpen)}
              >
                <span
                  className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"}`}
                >
                  <FolderOpen size={18} />
                  {!isCollapsed && (t("common.projects") || "Projects")}
                </span>
                {!isCollapsed &&
                  (isProjectsOpen ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  ))}
              </button>

              {isProjectsOpen && (
                <div
                  className={`flex flex-col gap-1 mt-1 ${isCollapsed ? "" : "pl-9 pr-2"}`}
                >
                  {projects.map((project: { domain: string }) => (
                    <NextLink
                      key={project.domain}
                      className={navLinkClass(
                        pathname === `/project/${project.domain}`,
                      )}
                      href={`/project/${project.domain}`}
                      title={isCollapsed ? project.domain : undefined}
                    >
                      <Globe className="shrink-0" size={14} />
                      {!isCollapsed && (
                        <span className="truncate">{project.domain}</span>
                      )}
                    </NextLink>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>
      </div>

      <div
        className={`flex flex-col p-4 border-t border-default-200 ${isCollapsed ? "items-center" : ""}`}
      >
        {isAuthenticated && (
          <NextLink
            className={navLinkClass(pathname === "/settings") + " mb-4"}
            href="/settings"
            title={isCollapsed ? t("common.settings") : undefined}
          >
            <Settings size={18} />
            {!isCollapsed && t("common.settings")}
          </NextLink>
        )}

        <Dropdown placement="top-start">
          <DropdownTrigger>
            <Button
              className={`justify-between mb-4 bg-default-50 hover:bg-default-100 ${isCollapsed ? "w-10 min-w-10 px-0 justify-center" : "w-full"}`}
              endContent={
                !isCollapsed ? (
                  <Globe className="text-default-500" size={16} />
                ) : undefined
              }
              isIconOnly={isCollapsed}
              size="sm"
              variant="flat"
            >
              {isCollapsed ? (
                <Globe className="text-default-500" size={18} />
              ) : (
                <span className="text-default-700">
                  {language === "lt" ? "Lietuvių" : "English"}
                </span>
              )}
            </Button>
          </DropdownTrigger>
          <DropdownMenu
            aria-label="Language selection"
            selectedKeys={new Set([language])}
            selectionMode="single"
            onAction={(key) => setLanguage(key as "en" | "lt")}
          >
            <DropdownItem key="en" startContent={<Globe size={18} />}>
              English
            </DropdownItem>
            <DropdownItem key="lt" startContent={<Globe size={18} />}>
              Lietuvių
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>

        {isAuthenticated && user && (
          <Dropdown placement="top-start">
            <DropdownTrigger>
              <button
                className={`flex items-center gap-3 p-2 rounded-xl hover:bg-default-100 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-primary/20 ${isCollapsed ? "justify-center w-full" : "w-full"}`}
              >
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">
                  {getInitials(user.email)}
                </div>
                {!isCollapsed && (
                  <>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground truncate">
                        {user.email}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {isSuperAdmin ? (
                          <span className="text-xs text-warning-500 font-medium">
                            Admin
                          </span>
                        ) : (
                          <span className="text-xs text-default-500 capitalize">
                            {user.plan_tier || "Free"} Plan
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronDown
                      className="text-default-400 shrink-0"
                      size={16}
                    />
                  </>
                )}
              </button>
            </DropdownTrigger>
            <DropdownMenu aria-label="User actions">
              <DropdownItem
                key="profile"
                className="h-14 gap-2"
                textValue="Signed in as"
              >
                <p className="font-semibold text-sm">Signed in as</p>
                <p className="font-medium text-sm text-default-500 truncate">
                  {user.email}
                </p>
              </DropdownItem>
              {isSuperAdmin ? (
                <DropdownItem key="admin_badge" textValue="Admin Status">
                  <Chip color="warning" size="sm" variant="flat">
                    {t("common.admin")}
                  </Chip>
                </DropdownItem>
              ) : user.plan_tier && user.plan_tier !== "free" ? (
                <DropdownItem key="plan_badge" textValue="Plan Status">
                  <Chip
                    color={
                      user.plan_tier === "growth"
                        ? "secondary"
                        : user.plan_tier === "enterprise"
                          ? "warning"
                          : "primary"
                    }
                    size="sm"
                    variant="flat"
                  >
                    {user.plan_tier.charAt(0).toUpperCase() +
                      user.plan_tier.slice(1)}
                    {user.plan_status === "trialing"
                      ? ` (${t("billing.trialing")})`
                      : ""}
                  </Chip>
                </DropdownItem>
              ) : (
                <DropdownItem key="plan_free" className="hidden" textValue="" />
              )}
              <DropdownItem
                key="plan_link"
                href="/pricing"
                startContent={<CreditCard size={16} />}
              >
                {t("billing.viewPlans") || "Plans & Pricing"}
              </DropdownItem>
              <DropdownItem
                key="billing_portal"
                startContent={<CreditCard size={16} />}
                onPress={handleManageBilling}
              >
                {t("billing.viewBilling") || "View Billing"}
              </DropdownItem>
              <DropdownItem
                key="logout"
                className="text-danger mt-2"
                color="danger"
                startContent={<LogOut size={16} />}
                onPress={logout}
              >
                {t("common.logout")}
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        )}
      </div>
    </aside>
  );
};
