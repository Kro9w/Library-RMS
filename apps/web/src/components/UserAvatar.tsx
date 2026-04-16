import { UserNameFields } from "../utils/user";
import { UserInitialsAvatar } from "./UserInitialsAvatar";

type Props = {
  user: UserNameFields & { imageUrl?: string | null };
  size?: number;
  className?: string;
};

export function UserAvatar({ user, size = 48, className }: Props) {
  return (
    <UserInitialsAvatar
      firstName={user.firstName}
      lastName={user.lastName}
      imageUrl={user.imageUrl}
      size={size}
      className={`rounded-circle ${className || ""}`}
    />
  );
}
