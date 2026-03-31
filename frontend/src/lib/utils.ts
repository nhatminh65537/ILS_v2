/**
 * Utility functions
 * cn() merges Tailwind classes intelligently using clsx + tailwind-merge
 */

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge CSS class names with intelligent Tailwind conflict resolution
 * Combines clsx() for conditional logic with twMerge() for overrides
 *
 * @example
 * cn('px-2', true && 'px-4')  // returns 'px-4'
 * cn('bg-white', 'dark:bg-black') // both included
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
