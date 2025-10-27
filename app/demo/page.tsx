"use client";

import { Suspense } from "react";
import DemoPage from "@/app/components/DemoPage";
import { Spinner } from "@heroui/spinner";

function DemoPageWrapper() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center">
        <Spinner size="lg" color="primary" />
      </div>
    }>
      <DemoPage />
    </Suspense>
  );
}

export default DemoPageWrapper;
