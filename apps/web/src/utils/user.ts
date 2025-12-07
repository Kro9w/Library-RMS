// apps/web/src/utils/user.ts

/**
 * Interface representing the basic user name fields.
 * Matches the structure returned by the API (PostgreSQL User model).
 */
export interface UserNameFields {
  firstName: string;
  middleName?: string | null;
  lastName: string;
  email?: string;
  name?: string | null; // Backwards compatibility if needed, or if API sends legacy field
}

/**
 * Formats a user's name as "First Middle Last".
 * E.g. "John Quimby Doe" or "John Doe"
 */
export const formatUserNameFirstLast = (user: UserNameFields | undefined | null): string => {
  if (!user) return "Unknown User";
  
  // Fallback for objects that might still have the old 'name' property
  if (!user.firstName && user.name) return user.name;
  if (!user.firstName && !user.lastName) return user.email || "Unknown User";

  const parts = [user.firstName, user.middleName, user.lastName].filter(Boolean);
  return parts.join(" ");
};

/**
 * Formats a user's name as "Last, First Middle".
 * E.g. "Doe, John Quimby" or "Doe, John"
 */
export const formatUserNameLastFirst = (user: UserNameFields | undefined | null): string => {
  if (!user) return "Unknown User";

  // Fallback
  if (!user.firstName && user.name) return user.name;
  if (!user.firstName && !user.lastName) return user.email || "Unknown User";

  const firstMiddle = [user.firstName, user.middleName].filter(Boolean).join(" ");
  return `${user.lastName}, ${firstMiddle}`;
};

/**
 * Default formatter (currently aliases to FirstLast as per general usage, 
 * but can be switched easily).
 */
export const formatUserName = formatUserNameFirstLast;
