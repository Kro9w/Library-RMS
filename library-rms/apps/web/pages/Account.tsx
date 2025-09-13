import { UserProfile } from "@clerk/clerk-react";

export function AccountPage() {
  return (
    <div className="d-flex justify-content-center py-4">
      <UserProfile />
    </div>
  );
}
