"use client";

import React, { useEffect, useState } from "react";
import ProjectCard from "./ProjectCard";
import { Spinner } from "@heroui/spinner";
import { config } from "@/lib/config";

interface Project {
  domain: string;
  table_name: string;
  page_count: number;
  last_updated?: string;
}

interface ExistingProjectsProps {
  authKey: string;
  onProjectSelect: (url: string) => void;
}

export default function ExistingProjects({ authKey, onProjectSelect }: ExistingProjectsProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch(`${config.serverUrl}/api/scrape/projects/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Key": authKey,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch projects");
      }

      setProjects(data.projects || []);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl">
        <h3 className="text-lg font-semibold mb-4">Existing Projects</h3>
        <div className="flex justify-center py-8">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl">
        <h3 className="text-lg font-semibold mb-4">Existing Projects</h3>
        <p className="text-red-500 text-center py-4">Error loading projects: {error}</p>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="w-full max-w-4xl">
        <h3 className="text-lg font-semibold mb-4">Existing Projects</h3>
        <p className="text-gray-500 text-center py-8">No existing projects found. Start by scraping your first website!</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl">
      <h3 className="text-lg font-semibold mb-4">Existing Projects ({projects.length})</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <ProjectCard
            key={project.table_name}
            project={project}
            onSelect={onProjectSelect}
          />
        ))}
      </div>
    </div>
  );
}
