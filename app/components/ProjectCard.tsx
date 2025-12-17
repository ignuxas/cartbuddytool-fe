"use client";

import React from "react";
import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { useRouter } from "next/navigation";

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

export default function ProjectCard({ project, onSelect, onDelete }: ProjectCardProps) {
  const router = useRouter();

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return "Unknown";
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
    if (onDelete && confirm(`Are you sure you want to delete project ${project.domain}? This action cannot be undone.`)) {
      onDelete(project.domain);
    }
  };

  return (
    <Card className="w-full hover:shadow-lg transition-shadow relative group">
      <CardBody className="p-4">
        {onDelete && (
          <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              isIconOnly
              size="sm"
              color="danger"
              variant="light"
              onPress={handleDelete}
              aria-label="Delete project"
              className="min-w-8 w-8 h-8"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </Button>
          </div>
        )}
        <div className="flex justify-between items-start mb-2 pr-8">
          <h4 className="text-lg font-semibold text-blue-600 truncate">
            {project.domain}
          </h4>
          <Chip size="sm" variant="flat" color="primary">
            {project.page_count} pages
          </Chip>
        </div>
        
        {project.active_job && (
          <div className="mb-3 p-2 bg-primary-50 dark:bg-primary-900/20 rounded-md border border-primary-100 dark:border-primary-800">
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-primary">Scraping in progress...</span>
              <span>{project.active_job.scraped_pages} / {project.active_job.total_pages}</span>
            </div>
            <div className="w-full bg-default-200 rounded-full h-1.5">
              <div 
                className="bg-primary h-1.5 rounded-full transition-all duration-500" 
                style={{ width: `${(project.active_job.scraped_pages / Math.max(project.active_job.total_pages, 1)) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        <p className="text-sm text-gray-600 mb-3">
          Last updated: {formatDate(project.last_updated)}
        </p>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            color="primary" 
            variant="flat"
            className="flex-1"
            onPress={handleClick}
          >
            Load Project
          </Button>
          <Button 
            size="sm" 
            color="secondary" 
            variant="flat"
            className="flex-1"
            onPress={handleMetricsClick}
          >
            Metrics
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
