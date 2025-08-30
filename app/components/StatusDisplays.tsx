"use client";

import { Snippet } from "@heroui/snippet";

interface StatusDisplaysProps {
  message: string;
  errorMessage: string;
  warnings: string;
}

export default function StatusDisplays({
  message,
  errorMessage,
  warnings,
}: StatusDisplaysProps) {
  return (
    <>
      {message && (
        <div className="mt-8 w-full max-w-4xl text-center">
          <Snippet hideCopyButton hideSymbol variant="bordered" color="success">
            <span>{message}</span>
          </Snippet>
        </div>
      )}

      {errorMessage && (
        <div className="mt-4 w-full max-w-4xl text-center">
          <Snippet hideCopyButton hideSymbol variant="bordered" color="danger">
            <span>{errorMessage}</span>
          </Snippet>
        </div>
      )}

      {warnings && (
        <div className="mt-4 w-full max-w-4xl text-center">
          <Snippet hideCopyButton hideSymbol variant="bordered" color="warning">
            <span>{warnings}</span>
          </Snippet>
        </div>
      )}
    </>
  );
}
