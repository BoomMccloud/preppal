/**
 * Navigation utilities with locale support
 * Use these instead of next/link and next/navigation
 */
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
