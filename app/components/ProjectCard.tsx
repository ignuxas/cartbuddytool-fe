"use client";

import React from "react";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/app/contexts/LanguageContext";

interface Project {
  domain: string;
  table_name: string;
  page_count: number;
  last_updated?: string;
  active_job?: {
    status: string;
    scraped_pages: number;
    total_pages: number;
  };
}

interface ProjectCardProps {
  project: Project;
  onSelect: (domain: string) => void;
  onDelete?: (domain: string) => void;
}

export default function ProjectCard({
  project,
  onSelect: _onSelect,
  onDelete,
}: ProjectCardProps) {
  const router = useRouter();
  const { t } = useLanguage();

  const formatDate = (dateString?: string) => {
    if (!dateString) return t("projectCard.unknown");
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return t("projectCard.unknown");
    }
  };

  const handleClick = () => {
    // Navigate directly to the project page
    router.push(`/project/${encodeURIComponent(project.domain)}`);
  };

  const handleMetricsClick = () => {
    router.push(`/project/${encodeURIComponent(project.domain)}/metrics`);
  };

  const handleDelete = () => {
    if (
      onDelete &&
      confirm(t("projectCard.deleteConfirmation", { domain: project.domain }))
    ) {
      onDelete(project.domain);
    }
  };

  return (
    <div className="group flex flex-col md:flex-row md:items-center justify-between p-4 border-b border-divider last:border-b-0 hover:bg-default-100/50 transition-colors w-full">
      <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
        <div className="flex flex-col gap-1.5 w-full">
          <div className="flex items-center gap-3">
            <button
              className="text-base font-semibold truncate hover:text-primary cursor-pointer transition-colors"
              onClick={handleClick}
            >
              {project.domain}
            </button>
            {project.active_job ? (
              <Chip color="warning" size="sm" variant="dot">
                {t("projectCard.scrapingInProgress")} (
                {project.active_job.scraped_pages}/
                {project.active_job.total_pages})
              </Chip>
            ) : (
              <Chip color="success" size="sm" variant="dot">
                Active
              </Chip>
            )}
          </div>
          <p className="text-xs text-default-500">
            {project.page_count} {t("projectCard.pages")} •{" "}
            {t("projectCard.lastUpdated")} {formatDate(project.last_updated)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4 md:mt-0">
        <Button color="primary" size="sm" variant="flat" onPress={handleClick}>
          {t("projectCard.loadProject")}
        </Button>
        <Button
          color="secondary"
          size="sm"
          variant="flat"
          onPress={handleMetricsClick}
        >
          {t("projectCard.metrics")}
        </Button>
        {onDelete && (
          <Button
            isIconOnly
            aria-label={t("projectCard.deleteProject")}
            className="min-w-8 w-8 h-8"
            color="danger"
            size="sm"
            variant="light"
            onPress={handleDelete}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
        )}
      </div>
    </div>
  );
}
