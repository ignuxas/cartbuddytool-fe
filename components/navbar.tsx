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
import { useAuthContext } from "@/app/contexts/AuthContext";
import { usePathname } from "next/navigation";

import {
  Logo,
} from "@/components/icons";

export const Navbar = () => {
  const { isAuthenticated, logout } = useAuthContext();
  const pathname = usePathname();

  return (
    <HeroUINavbar maxWidth="xl" position="sticky">
      <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
        <NavbarBrand as="li" className="gap-3 max-w-fit">
          <NextLink className="flex justify-start items-center gap-1" href="/">
            <Logo />
            <p className="font-bold text-inherit">CartBuddy Tools</p>
          </NextLink>
        </NavbarBrand>
        <div className="hidden lg:flex gap-4 justify-start ml-2">
            <NavbarItem isActive={pathname === "/"}>
              <NextLink className="text-foreground data-[active=true]:text-primary data-[active=true]:font-medium" href="/">
                Dashboard
              </NextLink>
            </NavbarItem>
            {isAuthenticated && (
              <NavbarItem isActive={pathname === "/new"}>
                <NextLink className="text-foreground data-[active=true]:text-primary data-[active=true]:font-medium" href="/new">
                  New Project
                </NextLink>
              </NavbarItem>
            )}
            {isAuthenticated && (
              <NavbarItem isActive={pathname === "/prompts"}>
                <NextLink className="text-foreground data-[active=true]:text-primary data-[active=true]:font-medium" href="/prompts">
                  Prompts
                </NextLink>
              </NavbarItem>
            )}
        </div>
      </NavbarContent>

      <NavbarContent justify="end">
        {isAuthenticated && (
            <NavbarItem>
              <Button 
                color="danger" 
                variant="flat" 
                size="sm"
                onPress={logout}
              >
                Logout
              </Button>
            </NavbarItem>
        )}
      </NavbarContent>
    </HeroUINavbar>
  );
};
