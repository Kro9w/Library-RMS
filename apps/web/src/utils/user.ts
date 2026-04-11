export interface UserNameFields {
  firstName: string;
  middleName?: string | null;
  lastName: string;
  email?: string;
  name?: string | null;
}

export const formatUserNameFirstLast = (user: UserNameFields | undefined | null): string => {
  if (!user) return "Unknown User";
  
  if (!user.firstName && user.name) return user.name;
  if (!user.firstName && !user.lastName) return user.email || "Unknown User";

  const parts = [user.firstName, user.middleName, user.lastName].filter(Boolean);
  return parts.join(" ");
};

export const formatUserNameLastFirst = (user: UserNameFields | undefined | null): string => {
  if (!user) return "Unknown User";

  if (!user.firstName && user.name) return user.name;
  if (!user.firstName && !user.lastName) return user.email || "Unknown User";

  const firstMiddle = [user.firstName, user.middleName].filter(Boolean).join(" ");
  return `${user.lastName}, ${firstMiddle}`;
};

export const formatUserName = formatUserNameFirstLast;
