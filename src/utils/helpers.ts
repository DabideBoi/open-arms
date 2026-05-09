// Utility functions for the Open Arms game

/**
 * Generate a simple UUID v4
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate a random name from name lists
 */
export function generateRandomName(firstNames: string[], lastNames: string[]): string {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${firstName} ${lastName}`;
}

/**
 * Get a random item from an array
 */
export function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Get random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Calculate distance between two points
 */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Extract initials from a name (like Google's avatar system)
 * - For "FirstName LastName": returns "FL" (first letter of each)
 * - For single name "Name": returns "NA" (first two letters)
 * - Always returns uppercase, max 2 characters
 */
export function getInitials(name: string): string {
  if (!name || name.trim().length === 0) {
    return '??';
  }
  
  const parts = name.trim().split(/\s+/);
  
  if (parts.length >= 2) {
    // Multiple names: first letter of first name + first letter of last name
    const firstInitial = parts[0].charAt(0);
    const lastInitial = parts[parts.length - 1].charAt(0);
    return (firstInitial + lastInitial).toUpperCase();
  } else {
    // Single name: first two letters
    const singleName = parts[0];
    if (singleName.length >= 2) {
      return singleName.substring(0, 2).toUpperCase();
    }
    return singleName.toUpperCase();
  }
}
