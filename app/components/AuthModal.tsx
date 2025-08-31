"use client";

import { useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";

interface AuthModalProps {
  isOpen: boolean;
  onAuthenticate: (key: string) => void;
}

export default function AuthModal({ isOpen, onAuthenticate }: AuthModalProps) {
  const [authKey, setAuthKey] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authKey.trim()) {
      setError('Please enter an authentication key');
      return;
    }
    setError('');
    onAuthenticate(authKey.trim());
  };

  return (
    <Modal 
      isOpen={isOpen} 
      isDismissable={false}
      hideCloseButton
      backdrop="blur"
      classNames={{
        backdrop: "bg-gradient-to-t from-zinc-900 to-zinc-900/10 backdrop-opacity-20"
      }}
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
              autoFocus
              label="Authentication Key"
              placeholder="Enter your key here"
              type="password"
              value={authKey}
              onValueChange={setAuthKey}
              variant="bordered"
              isInvalid={!!error}
              errorMessage={error}
            />
          </ModalBody>
          <ModalFooter>
            <Button color="primary" type="submit" className="w-full">
              Authenticate
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
