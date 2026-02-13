"use client";

import React from "react";
import { useAuth } from "@/app/contexts/AuthContext";

export default function PromptPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
      return <div>Loading...</div>;
  }

  return (
    <>
      {isAuthenticated && (
        <div className="pt-4 max-w-4xl mx-auto">
            {/* Prompt Generator disabled */}
        </div>
      )}
    </>
  );
}
