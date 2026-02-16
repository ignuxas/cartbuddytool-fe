"use client";

import { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { addToast } from "@heroui/toast";

interface AuthModalProps {
  isOpen: boolean;
  onAuthenticate: (key: string) => void;
}

export default function AuthModal({ isOpen, onAuthenticate }: AuthModalProps) {
  const [authKey, setAuthKey] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authKey.trim()) {
      addToast({
        title: "Authentication Error",
        description: "Please enter an authentication key",
        color: "danger",
      });

      return;
    }
    onAuthenticate(authKey.trim());
  };

  return (
    <Modal
      hideCloseButton
      backdrop="blur"
      classNames={{
        backdrop:
          "bg-gradient-to-t from-zinc-900 to-zinc-900/10 backdrop-opacity-20",
      }}
      isDismissable={false}
      isOpen={isOpen}
    >
      <ModalContent>
        <form onSubmit={handleSubmit}>
          <ModalHeader className="flex flex-col gap-1">
            Authentication Required
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-gray-600 mb-4">
              Please enter your authentication key to access the application.
            </p>
            <Input
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              label="Authentication Key"
              placeholder="Enter your key here"
              type="password"
              value={authKey}
              variant="bordered"
              onValueChange={setAuthKey}
            />
          </ModalBody>
          <ModalFooter>
            <Button className="w-full" color="primary" type="submit">
              Authenticate
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
