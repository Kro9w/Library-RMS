import { UserNameFields, formatUserName } from "../utils/user";

type Props = {
  user: UserNameFields;
  size?: number;
  className?: string;
};

export function UserAvatar({ user, size = 48, className }: Props) {
  const displayName = formatUserName(user);
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    displayName,
  )}&background=ED9B40&color=fff&size=${size * 2}`; // Request higher-res for retina

  return (
    <img
      src={avatarUrl}
      alt={`${displayName}'s Avatar`}
      className={`rounded-circle ${className || ""}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        objectFit: "cover",
      }}
    />
  );
}
