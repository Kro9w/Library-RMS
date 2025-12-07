// apps/web/src/components/UserAvatar.tsx
import { UserNameFields, formatUserName } from "../utils/user";

type Props = {
  user: UserNameFields;
  size?: number;
};

export function UserAvatar({ user, size = 48 }: Props) {
  const displayName = formatUserName(user);
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    displayName
  )}&background=ED9B40&color=fff&size=${size * 2}`; // Request higher-res for retina

  return (
    <img
      src={avatarUrl}
      alt={`${displayName}'s Avatar`}
      className="rounded-circle"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        objectFit: "cover",
      }}
    />
  );
}
