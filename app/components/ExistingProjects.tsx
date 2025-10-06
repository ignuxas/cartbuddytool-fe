"use client";

import React, { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { config } from "@/lib/config";
import { addToast } from "@heroui/toast";
import ProjectCard from "./ProjectCard";

interface Project {
  domain: string;
  table_name: string;
  page_count: number;
  last_updated?: string;
}

interface ExistingProjectsProps {
  authKey: string | null;
  onSelectProject?: (url: string) => void;
}

const SkeletonCard = () => (
  <Card className="animate-pulse flex flex-col h-full">
    <CardHeader>
      <div className="h-6 bg-gray-300 rounded-md dark:bg-gray-700 w-2/3"></div>
    </CardHeader>
    <CardBody className="flex-grow flex flex-col">
      <div className="h-4 bg-gray-300 rounded-md dark:bg-gray-700 w-1/2 mb-4"></div>
      <div className="flex-grow" />
      <div className="h-8 bg-gray-300 rounded-md dark:bg-gray-700 w-1/3"></div>
    </CardBody>
  </Card>
);

const EmptyStateIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
);


const ExistingProjects: React.FC<ExistingProjectsProps> = ({ authKey, onSelectProject }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, [authKey]);

  const fetchProjects = async () => {
    if (!authKey) {
        setLoading(false);
        setProjects([]);
        return;
    }
    setLoading(true);
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
      addToast({
        title: "Error",
        description: error.message || "Failed to fetch projects",
        color: "danger",
      });
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProject = (url: string) => {
    if (onSelectProject) {
      onSelectProject(url);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl">
        <h3 className="text-2xl font-bold mb-6">Existing Projects</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
        <div className="w-full max-w-4xl text-center py-16">
            <EmptyStateIcon />
            <h3 className="text-xl font-semibold mt-4">No Projects Yet</h3>
            <p className="text-gray-500 mt-2">Start by scraping your first website to see your projects here.</p>
        </div>
    );
  }

  return (
    <div className="w-full max-w-4xl pt-6">
      <h3 className="text-2xl font-bold mb-6">Existing Projects ({projects.length})</h3>
      {projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.domain}
              project={project}
              onSelect={handleSelectProject}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ExistingProjects;
