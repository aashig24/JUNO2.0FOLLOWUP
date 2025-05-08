import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple class values, handling Tailwind CSS class conflicts.
 * Uses 'clsx' to handle conditional class names and 'tailwind-merge' to handle class conflicts.
 * 
 * @param inputs - Class values to be combined
 * @returns A merged className string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a currency value to a given currency code
 * 
 * @param value - The numeric value to format
 * @param currencyCode - Currency code (default: USD)
 * @returns Formatted currency string
 */
export function formatCurrency(value: number, currencyCode = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(value);
}

/**
 * Formats a date to a readable string
 * 
 * @param date - Date to format
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  }
): string {
  if (typeof date === "string") {
    date = new Date(date);
  }
  return new Intl.DateTimeFormat("en-US", options).format(date);
}

/**
 * Truncates text to a specified length and adds ellipsis
 * 
 * @param text - Text to truncate
 * @param length - Maximum length (default: 100)
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, length = 100): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

/**
 * Debounces a function call
 * 
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return function(...args: Parameters<T>): void {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Validates if a string is a valid email
 * 
 * @param email - Email to validate
 * @returns Boolean indicating if email is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates if an email is a university email
 * 
 * @param email - Email to validate
 * @returns Boolean indicating if email is a university email
 */
export function isUniversityEmail(email: string): boolean {
  return isValidEmail(email) && email.toLowerCase().endsWith('.edu');
}

/**
 * Generates random avatar URL based on initials
 * 
 * @param name - Full name to get initials from
 * @returns Avatar URL
 */
export function getAvatarUrl(name: string): string {
  const initials = name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase();
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=random&color=fff`;
}
