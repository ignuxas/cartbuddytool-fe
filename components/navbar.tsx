"use client";

import {
  Navbar as HeroUINavbar,
  NavbarContent,
  NavbarBrand,
  NavbarItem,
} from "@heroui/navbar";
import { Link } from "@heroui/link";
import NextLink from "next/link";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from "@heroui/dropdown";
import { useAuth } from "@/app/contexts/AuthContext";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { usePathname } from "next/navigation";

import {
  Logo,
} from "@/components/icons";

export const Navbar = () => {
  const { isAuthenticated, isSuperAdmin, user, logout } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const pathname = usePathname();

  return (
    <HeroUINavbar maxWidth="xl" position="sticky">
      <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
        <NavbarBrand as="li" className="gap-3 max-w-fit">
          <NextLink className="flex justify-start items-center gap-1" href="/">
            <Logo />
            <p className="font-bold text-inherit">{t('common.appName')}</p>
          </NextLink>
        </NavbarBrand>
        <div className="hidden lg:flex gap-4 justify-start ml-2">
            <NavbarItem isActive={pathname === "/"}>
              <NextLink className="text-foreground data-[active=true]:text-primary data-[active=true]:font-medium" href="/">
                {t('common.dashboard')}
              </NextLink>
            </NavbarItem>
            {isAuthenticated && isSuperAdmin && (
              <NavbarItem isActive={pathname === "/new"}>
                <NextLink className="text-foreground data-[active=true]:text-primary data-[active=true]:font-medium" href="/new">
                  {t('common.newProject')}
                </NextLink>
              </NavbarItem>
            )}
            {isAuthenticated && isSuperAdmin && (
              <NavbarItem isActive={pathname === "/prompts"}>
                <NextLink className="text-foreground data-[active=true]:text-primary data-[active=true]:font-medium" href="/prompts">
                  {t('common.prompts')}
                </NextLink>
              </NavbarItem>
            )}
            {isAuthenticated && isSuperAdmin && (
              <NavbarItem isActive={pathname === "/users"}>
                <NextLink className="text-foreground data-[active=true]:text-primary data-[active=true]:font-medium" href="/users">
                  {t('common.users')}
                </NextLink>
              </NavbarItem>
            )}
        </div>
      </NavbarContent>

      <NavbarContent justify="end">
        <NavbarItem>
          <Dropdown>
            <DropdownTrigger>
              <Button variant="light" size="sm" isIconOnly={false} className="min-w-fit px-2">
                {language === 'lt' ? '🇱🇹 LT' : '🇺🇸 EN'}
              </Button>
            </DropdownTrigger>
            <DropdownMenu 
              aria-label="Language" 
              onAction={(key) => setLanguage(key as 'en' | 'lt')}
              selectedKeys={new Set([language])}
              selectionMode="single"
            >
              <DropdownItem key="en" startContent={<span className="text-xl">🇺🇸</span>}>English</DropdownItem>
              <DropdownItem key="lt" startContent={<span className="text-xl">🇱🇹</span>}>Lietuvių</DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </NavbarItem>
        {isAuthenticated && (
          <>
            <NavbarItem className="hidden sm:flex items-center gap-2">
              <span className="text-sm text-default-500">{user?.email}</span>
              {isSuperAdmin && (
                <Chip size="sm" color="warning" variant="flat">{t('common.admin')}</Chip>
              )}
            </NavbarItem>
            <NavbarItem>
              <Button 
                color="danger" 
                variant="flat" 
                size="sm"
                onPress={logout}
              >
                {t('common.logout')}
              </Button>
            </NavbarItem>
          </>
        )}
      </NavbarContent>
    </HeroUINavbar>
  );
};
