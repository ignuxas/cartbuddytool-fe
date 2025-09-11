"use client";

import React, { useEffect, useState } from "react";
import { Spinner } from "@heroui/spinner";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { config } from "@/lib/config";
import Link from "next/link";

interface Project {
  domain: string;
  page_count: number;
}

interface ExistingProjectsProps {
  authKey: string | null;
}

const ExistingProjects: React.FC<ExistingProjectsProps> = ({ authKey }) => {
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
          "X-Auth-Key": authKey!,
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
      {projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Card key={project.domain}>
              <CardHeader>
                <h4 className="font-bold text-lg">{project.domain}</h4>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-muted-foreground">
                  {project.page_count} pages scraped
                </p>
                <div className="mt-4">
                  <Link href={`/project/${project.domain}`}>
                    <Button color="primary" size="sm">
                      View Project
                    </Button>
                  </Link>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExistingProjects;
