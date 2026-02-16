"use client";

import { Suspense } from "react";
import { Spinner } from "@heroui/spinner";

import DemoPage from "@/app/components/DemoPage";

function DemoPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center">
          <Spinner color="primary" size="lg" />
        </div>
      }
    >
      <DemoPage />
    </Suspense>
  );
}

export default DemoPageWrapper;
