"use client";

import { useState } from "react";
import { usePathname, useRouter, useParams } from "next/navigation";
import { Tabs, Tab } from "@heroui/tabs";
import { Link } from "@heroui/link";
import { Button } from "@heroui/button";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { addToast } from "@heroui/toast";

import ChatWidgetLoader from "@/app/components/ChatWidgetLoader";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { useAuth } from "@/app/contexts/AuthContext";
import { makeApiCall } from "@/app/utils/apiHelper";
import { config } from "@/lib/config";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const domain = params.domain as string;
  const { t } = useLanguage();
  const { isSuperAdmin, accessToken } = useAuth();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteProject = async () => {
    if (!accessToken) return;
    setIsDeleting(true);
    try {
      await makeApiCall(
        `${config.serverUrl}/api/scrape/project/delete/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ domain }),
        },
        "delete-project",
      );
      addToast({
        title: t("common.success"),
        description: `Project "${domain}" has been deleted.`,
        color: "success",
      });
      router.push("/");
    } catch (error: any) {
      addToast({
        title: t("common.error"),
        description: error.message || "Failed to delete project.",
        color: "danger",
      });
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
    }
  };

  // Determine selected tab based on pathname
  let selected = "overview";

  if (pathname?.includes("/scraping")) selected = "scraping";
  else if (pathname?.includes("/bot")) selected = "bot";
  else if (pathname?.includes("/metrics")) selected = "metrics";

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 border-b border-divider pb-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Link
                className="text-muted-foreground hover:text-foreground"
                href="/"
              >
                {t("navigation.projects")}
              </Link>
              <span>/</span>
              <span>{domain}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{domain}</h1>
          </div>
          <div className="flex gap-2">
            {isSuperAdmin && (
              <Button
                color="danger"
                size="sm"
                variant="flat"
                onPress={() => setDeleteModalOpen(true)}
              >
                Delete Project
              </Button>
            )}
          </div>
        </div>

        <Tabs
          classNames={{
            tabList:
              "gap-6 w-full relative rounded-none p-0 border-b border-divider",
            cursor: "w-full bg-primary",
            tab: "max-w-fit px-0 h-12",
            tabContent: "group-data-[selected=true]:text-primary",
          }}
          color="primary"
          selectedKey={selected}
          variant="underlined"
          onSelectionChange={(key) => {
            if (key === "overview") router.push(`/project/${domain}`);
            else router.push(`/project/${domain}/${key}`);
          }}
        >
          <Tab key="overview" title={t("navigation.overview")} />
          <Tab key="scraping" title={t("navigation.scraping")} />
          <Tab key="bot" title={t("navigation.botConfiguration")} />
          <Tab key="metrics" title={t("navigation.metrics")} />
        </Tabs>
      </div>
      <div className="w-full">{children}</div>
      <ChatWidgetLoader domain={domain} />

      <Modal isOpen={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-danger">Delete Project</ModalHeader>
              <ModalBody>
                <p>
                  Are you sure you want to delete{" "}
                  <strong>{domain}</strong>? This will permanently remove all
                  scraped data, embeddings, prompt, and widget settings.
                </p>
                <p className="text-sm text-default-500 mt-2">
                  This action cannot be undone.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose} isDisabled={isDeleting}>
                  Cancel
                </Button>
                <Button
                  color="danger"
                  isLoading={isDeleting}
                  onPress={handleDeleteProject}
                >
                  Delete Project
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
