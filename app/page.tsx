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
      
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <div className="inline-block text-center justify-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Website Assistant Generator</h1>
          <h2 className="text-lg md:text-xl text-muted-foreground">Manage your projects or create a new one.</h2>
          {isAuthenticated && (
            <div className="flex gap-2 justify-center mt-4">
              <Button 
                color="primary"
                onPress={() => router.push('/new')}
              >
                Create New Project
              </Button>
              <Button 
                size="sm" 
                variant="light" 
                onPress={logout}
              >
                Logout
              </Button>
            </div>
          )}
        </div>

        {isAuthenticated && (
          <ExistingProjects authKey={authKey} />
        )}
      </section>
    </>
  );
}
