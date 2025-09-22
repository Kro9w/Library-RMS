// /pages/SignUpPage.tsx
import { SignUp } from "@clerk/clerk-react";

export function SignUpPage() {
  return (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: "80vh" }}
    >
      <SignUp afterSignUpUrl="/join-organization" />
    </div>
  );
}
