import { RetentionPolicyPanel } from "../../components/Retention/RetentionPolicyPanel";

export default function AdminRetentionPolicies() {
  return (
    <div>
      <h2 style={{ color: "var(--brand)", marginBottom: "0.5rem" }}>
        Records Retention Policies
      </h2>
      <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>
        Super admin view for establishing global standard records retention and
        disposition schedules.
      </p>

      <div className="mb-4">
        <RetentionPolicyPanel />
      </div>
    </div>
  );
}
