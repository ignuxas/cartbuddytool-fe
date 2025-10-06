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
}

interface ProjectCardProps {
  project: Project;
  onSelect: (domain: string) => void;
}

export default function ProjectCard({ project, onSelect }: ProjectCardProps) {
  const router = useRouter();

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return "Unknown";
    }
  };

  const getProtocol = (domain: string) => {
    // Simple heuristic - you might want to store this info in the database
    return domain.includes('localhost') ? 'http://' : 'https://';
  };

  const handleClick = () => {
    onSelect(`${getProtocol(project.domain)}${project.domain}`);
  };

  const handleMetricsClick = () => {
    router.push(`/project/${encodeURIComponent(project.domain)}/metrics`);
  };

  return (
    <Card className="w-full hover:shadow-lg transition-shadow">
      <CardBody className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h4 className="text-lg font-semibold text-blue-600 truncate">
            {project.domain}
          </h4>
          <Chip size="sm" variant="flat" color="primary">
            {project.page_count} pages
          </Chip>
        </div>
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
