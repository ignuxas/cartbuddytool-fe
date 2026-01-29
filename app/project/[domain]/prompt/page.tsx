"use client";

import React from "react";
import { useAuthContext } from "@/app/contexts/AuthContext";
import AuthModal from "@/app/components/AuthModal";

export default function PromptPage() {
  const { isAuthenticated, login, isLoading } = useAuthContext();

  if (isLoading) {
      return <div>Loading...</div>;
  }

  return (
    <>
      <AuthModal isOpen={!isAuthenticated} onAuthenticate={login} />
      {isAuthenticated && (
        <div className="pt-4 max-w-4xl mx-auto">
            {/* Prompt Generator disabled */}
        </div>
      )}
    </>
  );
}
