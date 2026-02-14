"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from "@heroui/dropdown";
import { config } from "@/lib/config";
import { addToast } from "@heroui/toast";
import ProjectCard from "./ProjectCard";
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

interface ExistingProjectsProps {
  authKey: string | null;
  onSelectProject?: (url: string) => void;
  isSuperAdmin?: boolean;
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


const ExistingProjects: React.FC<ExistingProjectsProps> = ({ authKey, onSelectProject, isSuperAdmin = false }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<string>("updated_desc");
  const { t } = useLanguage();

  const sortedProjects = useMemo(() => {
    let result = [...projects];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.domain.toLowerCase().includes(q));
    }

    result.sort((a, b) => {
      switch (sortKey) {
        case "domain_asc": return a.domain.localeCompare(b.domain);
        case "domain_desc": return b.domain.localeCompare(a.domain);
        case "pages_asc": return (a.page_count || 0) - (b.page_count || 0);
        case "pages_desc": return (b.page_count || 0) - (a.page_count || 0);
        case "updated_asc": return new Date(a.last_updated || 0).getTime() - new Date(b.last_updated || 0).getTime();
        case "updated_desc": return new Date(b.last_updated || 0).getTime() - new Date(a.last_updated || 0).getTime();
        default: return 0;
      }
    });

    return result;
  }, [projects, searchQuery, sortKey]);

  useEffect(() => {
    fetchProjects();
    
    // Poll for updates every 3 seconds to show scraping progress
    const interval = setInterval(() => {
      fetchProjects(true);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [authKey]);

  const fetchProjects = async (silent = false) => {
    if (!authKey) {
        setLoading(false);
        setProjects([]);
        return;
    }
    if (!silent) setLoading(true);
    try {
      const response = await fetch(`${config.serverUrl}/api/scrape/projects/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authKey}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('existingProjects.fetchError'));
      }

      const ignoredProjects = ['widget.events', 'users', 'user.projects'];
      const filteredProjects = (data.projects || []).filter((p: Project) => !ignoredProjects.includes(p.domain));
      setProjects(filteredProjects);
    } catch (error: any) {
      if (!silent) {
        addToast({
          title: t('existingProjects.errorTitle'),
          description: error.message || t('existingProjects.fetchError'),
          color: "danger",
        });
      }
      // Don't clear projects on error during polling
      if (!silent) setProjects([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleSelectProject = (url: string) => {
    if (onSelectProject) {
      onSelectProject(url);
    }
  };

  const handleDeleteProject = async (domain: string) => {
    if (!authKey) return;
    
    try {
      const response = await fetch(`${config.serverUrl}/api/scrape/project/delete/`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authKey}`,
        },
        body: JSON.stringify({ domain }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('existingProjects.deleteError'));
      }

      addToast({
        title: t('existingProjects.successTitle'),
        description: t('existingProjects.deleteSuccess', { domain }),
        color: "success",
      });
      
      // Refresh projects list
      fetchProjects();
    } catch (error: any) {
      addToast({
        title: t('existingProjects.errorTitle'),
        description: error.message || t('existingProjects.deleteError'),
        color: "danger",
      });
    }
  };

  if (loading) {
    return (
      <div className="w-full">
        <h3 className="text-2xl font-bold mb-6">{t('existingProjects.title')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
        <div className="w-full text-center py-16">
            <EmptyStateIcon />
            <h3 className="text-xl font-semibold mt-4">{t('existingProjects.noProjects')}</h3>
            <p className="text-gray-500 mt-2">{t('existingProjects.startScraping')}</p>
        </div>
    );
  }

  return (
    <div className="w-full pt-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h3 className="text-2xl font-bold">{t('existingProjects.title')} ({sortedProjects.length})</h3>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="w-full sm:w-64"
            startContent={
              <svg className="w-4 h-4 text-default-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
          <Dropdown>
            <DropdownTrigger>
              <Button variant="bordered" className="capitalize">
                Sort by: {sortKey.replace('_', ' ')}
              </Button>
            </DropdownTrigger>
            <DropdownMenu 
              aria-label="Sort options"
              disallowEmptySelection
              selectionMode="single"
              selectedKeys={[sortKey]}
              onSelectionChange={(keys) => setSortKey(Array.from(keys)[0] as string)}
            >
              <DropdownItem key="updated_desc">Newest First</DropdownItem>
              <DropdownItem key="updated_asc">Oldest First</DropdownItem>
              <DropdownItem key="domain_asc">Name (A-Z)</DropdownItem>
              <DropdownItem key="domain_desc">Name (Z-A)</DropdownItem>
              <DropdownItem key="pages_desc">Most Pages</DropdownItem>
              <DropdownItem key="pages_asc">Fewest Pages</DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>

      {sortedProjects.length === 0 && searchQuery ? (
        <div className="text-center py-12 text-default-500">
          No projects found matching "{searchQuery}"
        </div>
      ) : sortedProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedProjects.map((project) => (
            <ProjectCard
              key={project.domain}
              project={project}
              onSelect={handleSelectProject}
              onDelete={isSuperAdmin ? handleDeleteProject : undefined}
            />
          ))}
        </div>
      ) : projects.length > 0 ? (
        // Only show empty if no projects at all (not filtered)
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {/* Fallback unlikely needed due to previous check */}
        </div>
      ) : null}
    </div>
  );
};

export default ExistingProjects;
