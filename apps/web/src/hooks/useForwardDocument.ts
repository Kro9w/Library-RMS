import { useState, useMemo, useEffect, useRef } from "react";
import { trpc } from "../trpc";

export function useForwardDocument({
  show,
  documentId,
  initialRecipientId,
  users: propUsers,
  campuses: propCampuses,
}: any) {
  const [selectedCampusId, setSelectedCampusId] = useState<string>("");
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");
  const [recipientId, setRecipientId] = useState(initialRecipientId || "");

  const { data: fetchedUsers } = trpc.documents.getAppUsers.useQuery(undefined, { enabled: !propUsers && show });
  const { data: fetchedOrgHierarchy } = trpc.user.getInstitutionHierarchy.useQuery(undefined, { enabled: !propCampuses && show });
  const { data: document } = trpc.documents.getById.useQuery({ id: documentId }, { enabled: !!documentId && show });

  const isTransitDocument = document?.workflow?.recordStatus === "IN_TRANSIT" && document?.classification === "FOR_APPROVAL";

  const users = propUsers || fetchedUsers;
  const campuses = propCampuses || fetchedOrgHierarchy?.campuses || [];

  const trpcCtx = trpc.useContext();

  const nextRouteStop = useMemo(() => {
    if (!isTransitDocument || !document?.transitRoutes) return null;

    if (
      document.workflow?.status === "Returned for Corrections/Revision/Clarification" ||
      document.workflow?.status === "Disapproved"
    ) {
      return null;
    }

    const currentUser = users?.find((u: any) => u.id === trpcCtx.user.getMe.getData()?.id);
    const currentUserDept = currentUser?.departmentId || trpcCtx.user.getMe.getData()?.departmentId;
    const currentStop = document.transitRoutes.find((r: any) => r.status === "CURRENT");

    if (currentStop && currentUserDept === currentStop.departmentId) {
      const nextPending = document.transitRoutes.find(
        (r: any) => r.status === "PENDING" && r.sequenceOrder > currentStop.sequenceOrder,
      );
      if (nextPending) return nextPending;
    }

    if (currentStop) {
      return currentStop;
    }

    return document.transitRoutes.find((r: any) => r.status === "PENDING") || null;
  }, [document, isTransitDocument, users, trpcCtx]);

  const hasPrescribedRoute = !!nextRouteStop;

  const departments = useMemo(() => {
    if (!selectedCampusId) return [];
    return campuses.find((c: any) => c.id === selectedCampusId)?.departments || [];
  }, [selectedCampusId, campuses]);

  const filteredUsers = useMemo(() => {
    if (selectedDeptId && departments.length > 0) {
      const dept = departments.find((d: any) => d.id === selectedDeptId);
      if (dept && dept.users) {
        return dept.users;
      }
    }
    if (users && selectedDeptId) {
      return users.filter((u: any) => u.departmentId === selectedDeptId);
    }
    return [];
  }, [selectedDeptId, departments, users]);

  const forwardDocumentMutation = trpc.documents.forwardDocument.useMutation();

  const targetDeptId = nextRouteStop?.departmentId;
  const initialRecipientIdSafe = initialRecipientId || "";
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!show) {
      isInitializedRef.current = false;
      return;
    }

    if (show && !isInitializedRef.current && campuses && campuses.length > 0 && users && users.length > 0) {
      if (hasPrescribedRoute && targetDeptId) {
        setSelectedDeptId(targetDeptId);

        const campus = campuses.find((c: any) =>
          c.departments.some((d: any) => d.id === targetDeptId),
        );
        if (campus) setSelectedCampusId(campus.id);

        setRecipientId("");
      } else if (initialRecipientIdSafe) {
        setRecipientId(initialRecipientIdSafe);
        let found = false;
        for (const c of campuses) {
          for (const d of c.departments) {
            const u = d.users?.find((u: any) => u.id === initialRecipientIdSafe);
            if (u) {
              setSelectedCampusId(c.id);
              setSelectedDeptId(d.id);
              found = true;
              break;
            }
          }
          if (found) break;
        }
        if (!found && users && users.length > 0) {
          const u = users.find((u: any) => u.id === initialRecipientIdSafe);
          if (u) {
            setSelectedCampusId((u as any).campusId || "");
            setSelectedDeptId((u as any).departmentId || "");
          }
        }
      } else {
        setRecipientId("");
        setSelectedCampusId("");
        setSelectedDeptId("");
      }
      isInitializedRef.current = true;
    }
  }, [show, initialRecipientIdSafe, hasPrescribedRoute, targetDeptId, campuses, users]);

  return {
    state: {
      selectedCampusId, setSelectedCampusId,
      selectedDeptId, setSelectedDeptId,
      recipientId, setRecipientId,
    },
    computed: {
      campuses,
      departments,
      filteredUsers,
      hasPrescribedRoute,
    },
    mutations: {
      forwardDocumentMutation,
    }
  };
}
