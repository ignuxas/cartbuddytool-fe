"use client";

import AuthModal from "./components/AuthModal";
import { Button } from "@heroui/button";
import ExistingProjects from "./components/ExistingProjects";
import { useRouter } from "next/navigation";
import { useAuthContext } from "./contexts/AuthContext";

export default function Home() {
  const { isAuthenticated, isLoading, login, logout, authKey } = useAuthContext();
  const router = useRouter();

  if (isLoading) {
    return (
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <div>Loading...</div>
      </section>
    );
  }

  return (
    <>
      <AuthModal 
        isOpen={!isAuthenticated} 
        onAuthenticate={login}
      />
      
      {!isAuthenticated ? (
        <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
          <div className="inline-block text-center justify-center max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
              CartBuddy Tools
            </h1>
            <h2 className="text-xl md:text-2xl text-muted-foreground mb-8">
              AI-Powered Website Scraper & Chat Assistant Generator
            </h2>
            <p className="text-lg text-default-500 mb-8">
              Log in to manage your scraping jobs, generate AI embeddings, and configure your chat widgets.
            </p>
          </div>
        </section>
      ) : (
        <section className="flex flex-col gap-8 py-8 px-4 w-full">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-divider pb-6">
            <div>
              <h1 className="text-3xl font-bold">My Projects</h1>
              <p className="text-muted-foreground mt-1">Manage and monitor your website assistants</p>
            </div>
            <Button 
              color="primary"
              size="lg"
              onPress={() => router.push('/new')}
              className="font-semibold shadow-lg shadow-primary/20"
              startContent={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14m-7-7v14"/>
                </svg>
              }
            >
              New Project
            </Button>
          </div>

          <div className="w-full">
            <ExistingProjects authKey={authKey} />
          </div>
        </section>
      )}
    </>
  );
}
