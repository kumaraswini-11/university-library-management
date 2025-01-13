import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * This function takes a full name as input and returns the initials.
 * It splits the name by spaces, takes the first letter of each part,
 * joins them together, converts the result to uppercase, and then returns
 * the first two initials (if available).
 */
export const getInitials = (name: string): string =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
