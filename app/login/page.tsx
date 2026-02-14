"use client";

import { useState, useEffect } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Link } from "@heroui/link";
import { Divider } from "@heroui/divider";
import { addToast } from "@heroui/toast";
import { useAuth } from "@/app/contexts/AuthContext";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { login, loginWithGoogle, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated) {
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      addToast({ title: t('login.errorTitle'), description: t('login.missingCredentials'), color: "danger" });
      return;
    }
    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);
    if (result.error) {
      addToast({ title: t('login.loginFailed'), description: result.error, color: "danger" });
    } else {
      router.push("/");
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const result = await loginWithGoogle();
    setGoogleLoading(false);
    if (result.error) {
      addToast({ title: t('login.googleLoginFailed'), description: result.error, color: "danger" });
    }
  };

  return (
    <section className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-md">
        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
            CartBuddy
          </h1>
          <p className="text-default-500 mt-2">{t('login.subtitle')}</p>
        </div>

        <Card className="shadow-xl border border-divider/50">
          <CardHeader className="flex flex-col gap-1 pb-0">
            <h2 className="text-xl font-semibold">{t('login.welcomeBack')}</h2>
            <p className="text-sm text-default-500">{t('login.enterCredentials')}</p>
          </CardHeader>
          <CardBody className="gap-4">
            {/* Google OAuth */}
            <Button
              variant="bordered"
              className="w-full"
              size="lg"
              isLoading={googleLoading}
              onPress={handleGoogleLogin}
              startContent={
                !googleLoading && (
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )
              }
            >
              {t('login.continueWithGoogle')}
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <Divider className="flex-1" />
              <span className="text-xs text-default-400 uppercase">{t('login.or')}</span>
              <Divider className="flex-1" />
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <Input
                label={t('login.emailLabel')}
                placeholder={t('login.emailPlaceholder')}
                type="email"
                value={email}
                onValueChange={setEmail}
                variant="bordered"
                isRequired
                autoComplete="email"
              />
              <Input
                label={t('login.passwordLabel')}
                placeholder="******"
                type="password"
                value={password}
                onValueChange={setPassword}
                variant="bordered"
                isRequired
                autoComplete="current-password"
              />
              <Button
                color="primary"
                type="submit"
                className="w-full font-semibold"
                size="lg"
                isLoading={loading}
              >
                {t('login.signIn')}
              </Button>
            </form>

            {/* Register link */}
            <div className="text-center text-sm text-default-500 pt-2">
              {t('login.noAccount')}{" "}
              <Link href="/register" className="text-primary font-medium">
                {t('login.signUp')}
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </section>
  );
}
