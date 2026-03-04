import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { trpc } from "../../trpc";
import { useEffect } from "react";
import {
  IconBuilding,
  IconUsers,
  IconFileTypePdf,
  IconMapPins,
} from "@tabler/icons-react";
import { LoadingAnimation } from "../../components/ui/LoadingAnimation";

export default function AdminLayout() {
  const { data: dbUser, isLoading } = trpc.user.getMe.useQuery();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && dbUser && !dbUser.isSuperAdmin) {
      navigate("/", { replace: true });
    }
  }, [dbUser, isLoading, navigate]);

  if (isLoading) {
    return <LoadingAnimation />;
  }

  if (!dbUser?.isSuperAdmin) {
    return null;
  }

  const links = [
    {
      label: "Campuses",
      icon: <IconMapPins size={16} stroke={1.5} className="me-2" />,
      path: "/admin/campuses",
    },
    {
      label: "Departments",
      icon: <IconBuilding size={16} stroke={1.5} className="me-2" />,
      path: "/admin/departments",
    },
    {
      label: "Document Types",
      icon: <IconFileTypePdf size={16} stroke={1.5} className="me-2" />,
      path: "/admin/document-types",
    },
    {
      label: "System Users",
      icon: <IconUsers size={16} stroke={1.5} className="me-2" />,
      path: "/admin/users",
    },
  ];

  return (
    <div
      className="d-flex h-100"
      style={{ minHeight: "100vh", backgroundColor: "var(--background)" }}
    >
      {/* Sidebar */}
      <div
        className="d-flex flex-column flex-shrink-0 p-3"
        style={{
          width: "250px",
          borderRight: "1px solid var(--card-border)",
          backgroundColor: "var(--card-background)",
        }}
      >
        <span
          className="fs-5 fw-semibold mb-4 text-center"
          style={{ color: "var(--primary)" }}
        >
          Super Admin Panel
        </span>

        <ul className="nav nav-pills flex-column mb-auto">
          {links.map((link) => {
            const isActive = location.pathname.startsWith(link.path);
            return (
              <li className="nav-item mb-1" key={link.path}>
                <button
                  onClick={() => navigate(link.path)}
                  className={`nav-link w-100 text-start d-flex align-items-center ${isActive ? "active" : "link-body-emphasis"}`}
                  style={{
                    borderRadius: "8px",
                    color: isActive ? "var(--light-text)" : "var(--text)",
                    backgroundColor: isActive
                      ? "var(--primary)"
                      : "transparent",
                  }}
                >
                  {link.icon}
                  {link.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow-1 p-4" style={{ overflowY: "auto" }}>
        <Outlet />
      </div>
    </div>
  );
}
