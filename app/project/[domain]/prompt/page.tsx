"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useAuthContext } from "@/app/contexts/AuthContext";
import PromptGenerator from "@/app/components/PromptGenerator";
import AuthModal from "@/app/components/AuthModal";

export default function PromptPage() {
  const params = useParams();
  const domain = params.domain as string;
  const { isAuthenticated, authKey, login, isLoading } = useAuthContext();

  if (isLoading) {
      return <div>Loading...</div>;
  }

  return (
    <>
      <AuthModal isOpen={!isAuthenticated} onAuthenticate={login} />
      {isAuthenticated && (
        <div className="pt-4 max-w-4xl mx-auto">
            <PromptGenerator domain={domain} authKey={authKey!} />
        </div>
      )}
    </>
  );
}
