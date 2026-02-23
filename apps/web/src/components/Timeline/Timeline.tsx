// apps/web/src/components/Timeline/Timeline.tsx
import React from "react";
import LogCard from "../LogCard/LogCard";
import "./Timeline.css";
import { UserNameFields } from "../../utils/user";

interface Log {
  id: string;
  user: UserNameFields;
  action: string;
  organization: {
    name: string;
  };
  userRole: string;
  createdAt: string;
}

interface TimelineProps {
  logs: Log[];
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const Timeline: React.FC<TimelineProps> = ({ logs }) => {
  const groupedLogs = logs.reduce(
    (acc, log) => {
      const date = dateFormatter.format(new Date(log.createdAt));
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(log);
      return acc;
    },
    {} as Record<string, Log[]>,
  );

  return (
    <div className="timeline-container">
      {Object.entries(groupedLogs).map(([date, logsForDate]) => (
        <React.Fragment key={date}>
          <div className="timeline-date-header">{date}</div>
          {logsForDate.map((log) => (
            <div key={log.id} className="timeline-item">
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <LogCard log={log} />
              </div>
            </div>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
};

export default Timeline;
