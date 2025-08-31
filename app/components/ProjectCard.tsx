"use client";

import React from "react";
import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";

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
        <Button 
          size="sm" 
          color="primary" 
          variant="flat"
          className="w-full"
          onPress={handleClick}
        >
          Load Project
        </Button>
      </CardBody>
    </Card>
  );
}
