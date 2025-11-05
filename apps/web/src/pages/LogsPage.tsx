// apps/web/src/pages/LogsPage.tsx
import React from "react";
import Timeline from "../components/Timeline/Timeline";
import { trpc } from "../trpc";
import { LoadingAnimation } from "../components/ui/LoadingAnimation";

const LogsPage: React.FC = () => {
  const { data, isLoading, isError } = trpc.logs.getLogs.useQuery({
    page: 1,
    limit: 100, // Fetch up to 100 logs
  });

  return (
    <div className="container mt-4">
      <h1 className="mb-4">Audit Logs</h1>
      {isLoading && <LoadingAnimation />}
      {isError && <p>Error loading logs.</p>}
      {data && <Timeline logs={data.logs} />}
    </div>
  );
};

export default LogsPage;
