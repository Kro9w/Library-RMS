import { SignIn } from "@clerk/clerk-react";

export function LoginPage() {
  return (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: "80vh" }}
    >
      <SignIn />
    </div>
  );
}
