// apps/web/src/pages/FAQPage.tsx
import React, { useState, useMemo } from "react";
import "./FAQPage.css";

interface FAQItem {
  id: string;
  question: string;
  answer: React.ReactNode;
}

interface FAQCategory {
  id: string;
  label: string;
  icon: string;
  items: FAQItem[];
}

const FAQ_CATEGORIES: FAQCategory[] = [
  {
    id: "getting-started",
    label: "Getting Started",
    icon: "bi-play-circle",
    items: [
      {
        id: "gs-1",
        question: "How do I join an institution and set up my account?",
        answer: (
          <>
            <p>
              After signing up, you will be prompted to join your institution
              before accessing the system. Follow these steps:
            </p>
            <ol>
              <li>
                Select your <strong>campus</strong> from the dropdown list.
              </li>
              <li>
                Choose your <strong>department or office</strong>. If yours is
                not listed, you may create a new one.
              </li>
              <li>
                Once confirmed, your account will be assigned a default role and
                you will be redirected to the Dashboard.
              </li>
            </ol>
            <p>
              Your department head or an administrator can assign you a more
              specific role after you join.
            </p>
          </>
        ),
      },
      {
        id: "gs-2",
        question: "What do the different user roles mean?",
        answer: (
          <>
            <p>
              Plume RMS uses a four-level role hierarchy within each department:
            </p>
            <div className="faq-role-table">
              <div className="faq-role-row faq-role-header">
                <span>Level</span>
                <span>Typical Title</span>
                <span>Key Permissions</span>
              </div>
              <div className="faq-role-row">
                <span>
                  <span className="faq-badge faq-badge-brand">Level 1</span>
                </span>
                <span>Dean / Director / CEO</span>
                <span>Manage users, roles, and documents</span>
              </div>
              <div className="faq-role-row">
                <span>
                  <span className="faq-badge faq-badge-accent">Level 2</span>
                </span>
                <span>Coordinator / Manager</span>
                <span>Manage and review documents</span>
              </div>
              <div className="faq-role-row">
                <span>
                  <span className="faq-badge faq-badge-muted">Level 3</span>
                </span>
                <span>Secretary / Senior Officer</span>
                <span>Upload and view documents</span>
              </div>
              <div className="faq-role-row">
                <span>
                  <span className="faq-badge faq-badge-muted">Level 4</span>
                </span>
                <span>Faculty / Staff</span>
                <span>Upload and view own documents</span>
              </div>
            </div>
            <p className="faq-note">
              <i className="bi bi-info-circle" /> Institution-level
              administrators (Super Admins) have access to all campuses and
              departments system-wide.
            </p>
          </>
        ),
      },
      {
        id: "gs-3",
        question: "How do I update my profile name or photo?",
        answer: (
          <p>
            Navigate to <strong>My Account</strong> by clicking your avatar in
            the top-right corner and selecting <em>My Account</em>. From there
            you can edit your first, middle, and last name, and upload a profile
            photo by clicking the camera icon on your avatar.
          </p>
        ),
      },
    ],
  },
  {
    id: "documents",
    label: "Documents",
    icon: "bi-file-earmark-text",
    items: [
      {
        id: "doc-1",
        question: "How do I upload a document?",
        answer: (
          <>
            <p>
              Click the <strong>Upload</strong> button in the top navigation bar
              or on the Documents page. In the upload dialog:
            </p>
            <ol>
              <li>
                Drag and drop your file or click to browse. Accepted formats are{" "}
                <strong>PDF, DOCX, PNG, JPG, and TIFF</strong>.
              </li>
              <li>
                Select the <strong>classification level</strong> (see below for
                guidance).
              </li>
              <li>
                Optionally assign a <strong>document type</strong> for
                categorization and retention tracking.
              </li>
              <li>
                The system will automatically attempt to extract the{" "}
                <strong>control number</strong> from the document. You can
                correct this if needed.
              </li>
              <li>
                Click <strong>Upload</strong> to finalize.
              </li>
            </ol>
          </>
        ),
      },
      {
        id: "doc-2",
        question: "What are the document classification levels?",
        answer: (
          <>
            <p>
              Classification controls who can see a document across the
              institution:
            </p>
            <div className="faq-classification-list">
              <div className="faq-class-item">
                <span className="faq-class-badge faq-class-institutional">
                  <i className="bi bi-globe" /> Institutional
                </span>
                <span>
                  Visible to all users across the entire university. Requires
                  Level 1 or Admin access to publish. Must be in a finalized
                  format (PDF or image).
                </span>
              </div>
              <div className="faq-class-item">
                <span className="faq-class-badge faq-class-campus">
                  <i className="bi bi-building" /> Internal
                </span>
                <span>
                  Visible to all users within the same campus. Requires Level 1
                  or Admin access. Must be in a finalized format.
                </span>
              </div>
              <div className="faq-class-item">
                <span className="faq-class-badge faq-class-internal">
                  <i className="bi bi-people-fill" /> Departmental
                </span>
                <span>
                  Visible to members of the same department. Requires Level 2 or
                  Admin access.
                </span>
              </div>
              <div className="faq-class-item">
                <span className="faq-class-badge faq-class-confidential">
                  <i className="bi bi-incognito" /> Confidential
                </span>
                <span>
                  Visible only to the uploader and explicitly shared recipients.
                  Suitable for draft documents and sensitive correspondence.
                </span>
              </div>
            </div>
          </>
        ),
      },
      {
        id: "doc-3",
        question: "How do I send a document to another user?",
        answer: (
          <>
            <p>
              From the <strong>Documents</strong> page, click the three-dot
              actions menu on any document you own and select <em>Send</em>. In
              the dialog:
            </p>
            <ol>
              <li>Select the recipient's campus and department.</li>
              <li>Choose the recipient from the list.</li>
              <li>
                Optionally apply <strong>Action Tags</strong> such as{" "}
                <em>For Review</em> or <em>Communication</em>.
              </li>
            </ol>
            <p>
              The recipient will receive a notification and must actively{" "}
              <strong>Receive</strong> the document (via the Receive Document
              button on the Dashboard) before it appears in their document list.
            </p>
          </>
        ),
      },
      {
        id: "doc-4",
        question: "How do I receive a document sent to me?",
        answer: (
          <>
            <p>There are two ways to receive a document:</p>
            <ul>
              <li>
                <strong>From a digital distribution:</strong> Click{" "}
                <em>Receive Document</em> on the Dashboard. A list of pending
                documents will appear. Click <em>Receive</em> next to each one.
              </li>
              <li>
                <strong>Via control number (physical exchange):</strong> Click{" "}
                <em>Receive Document</em> on the Dashboard and enter the
                document's control number in the provided field.
              </li>
            </ul>
          </>
        ),
      },
      {
        id: "doc-5",
        question: "What is the document review workflow?",
        answer: (
          <>
            <p>
              Confidential documents can be routed for formal review using the{" "}
              <em>For Review</em> action tag when sending:
            </p>
            <ol>
              <li>
                The <strong>sender</strong> sends a confidential document with
                the <em>For Review</em> tag applied.
              </li>
              <li>
                The <strong>recipient</strong> (must have document management
                permission) receives a notification and opens the document.
              </li>
              <li>
                The reviewer clicks <strong>Review Document</strong>, selects a
                status (<em>Approved</em>, <em>Returned</em>, or{" "}
                <em>Disapproved</em>), adds optional remarks, and either returns
                it to the originator or forwards it to another user.
              </li>
            </ol>
          </>
        ),
      },
    ],
  },
  {
    id: "document-routing",
    label: "Approval Routing",
    icon: "bi-signpost-split",
    items: [
      {
        id: "dr-1",
        question: "How does prescribed approval routing work?",
        answer: (
          <>
            <p>
              When a document is classified as <strong>FOR_APPROVAL</strong>,
              you must define a prescribed sequence of offices (a transit route)
              that the document must pass through. The document state becomes{" "}
              <strong>IN_TRANSIT</strong>.
            </p>
            <ul>
              <li>
                The document moves from one office to the next sequentially.
                Only the <strong>currently active</strong> office in the route
                can review the document.
              </li>
              <li>
                Level 1 users (e.g. Dean, CEO) of the currently active office
                have exclusive permission to review and advance the document.
              </li>
            </ul>
            <p>
              When reviewing a document, intermediate offices have different
              options than the final destination office:
            </p>
            <div className="faq-classification-list mt-3">
              <div className="faq-class-item">
                <span className="badge bg-primary text-light me-2 px-2 py-1">
                  <i className="bi bi-forward-fill me-1" /> Endorsed / Noted
                </span>
                <span>
                  Available to intermediate offices. Automatically forwards the
                  document and notifies the <strong>next office</strong> in the
                  sequence.
                </span>
              </div>
              <div className="faq-class-item">
                <span className="badge bg-warning text-dark me-2 px-2 py-1">
                  <i className="bi bi-arrow-return-left me-1" /> Returned
                </span>
                <span>
                  Available to all offices. Halts the route and sends the
                  document back to the original sender for revisions.
                </span>
              </div>
              <div className="faq-class-item">
                <span className="badge bg-success text-light me-2 px-2 py-1">
                  <i className="bi bi-check-circle-fill me-1" /> Approved
                </span>
                <span>
                  Available <strong>only</strong> to the final office in the
                  prescribed route. Permanently finalizes the document.
                </span>
              </div>
            </div>
          </>
        ),
      },
      {
        id: "dr-2",
        question: "What happens when a document is 'Returned for Corrections'?",
        answer: (
          <>
            <p>
              If a reviewing office finds issues, they can select{" "}
              <strong>Returned for Corrections/Revision/Clarification</strong>.
              When this happens:
            </p>
            <ol>
              <li>
                The prescribed route halts. The document is not sent to the next
                office.
              </li>
              <li>
                The document is immediately sent back to the originator (the
                person who uploaded or requested the review), accompanied by a
                notification.
              </li>
              <li>
                The originator temporarily regains write access. They must{" "}
                <strong>Check Out</strong> the document, make the necessary
                fixes, and <strong>Check In</strong> a new version.
              </li>
              <li>
                Once fixed, the originator resubmits it. The route resumes
                exactly where it paused, returning to the office that requested
                the corrections.
              </li>
            </ol>
          </>
        ),
      },
      {
        id: "dr-3",
        question: "What happens when a document reaches final approval?",
        answer: (
          <p>
            When the final office in the prescribed route selects{" "}
            <strong>Approved</strong>, the document's transit lifecycle ends.
            Its record status is automatically finalized as{" "}
            <strong>FINAL</strong>, and its classification reverts to{" "}
            <strong>CONFIDENTIAL</strong>. This secures the document, locking it
            from further edits, and gives the original owner the ability to
            broadcast the final approved document depending on their standard
            role permissions.
          </p>
        ),
      },
      {
        id: "dr-4",
        question: "Where can I see the progress of an approval route?",
        answer: (
          <>
            <p>
              Open the document from your Dashboard or Documents list to view
              its <strong>Document Details</strong>. At the top of the Review
              Details section, you will see a horizontal{" "}
              <strong>Routing Progress</strong> visualization mapping out every
              office the document must pass through.
            </p>
            <div
              className="p-3 rounded mt-3 mb-3"
              style={{
                background: "var(--bg-subtle)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
              }}
            >
              <div className="routing-steps">
                {[
                  { label: "OSDW", status: "approved" },
                  { label: "CDAA", status: "current" },
                  { label: "CEO", status: "pending" },
                ].map((step, i, arr) => {
                  let className = "routing-step-pending";
                  let icon = "bi-circle";
                  if (step.status === "approved") {
                    className = "routing-step-approved";
                    icon = "bi-check-circle-fill";
                  } else if (step.status === "current") {
                    className = "routing-step-current";
                    icon = "bi-record-circle-fill";
                  }

                  return (
                    <React.Fragment key={step.label}>
                      <div className={`routing-step ${className}`}>
                        <div className="routing-step-icon">
                          <i className={`bi ${icon}`}></i>
                        </div>
                        <span className="routing-step-name">{step.label}</span>
                      </div>
                      {i < arr.length - 1 && (
                        <div
                          className={`routing-connector ${
                            step.status === "approved"
                              ? "routing-connector-done"
                              : ""
                          }`}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
            <p className="mb-0">
              Below the visualization is the <strong>Review History</strong>{" "}
              timeline, documenting exact timestamps, reviewer names, roles, and
              remarks at each step of the journey.
            </p>
          </>
        ),
      },
      {
        id: "doc-6",
        question:
          "How does document version control (Check Out / Check In) work?",
        answer: (
          <>
            <p>
              Version control prevents conflicting edits to draft documents:
            </p>
            <ul>
              <li>
                <strong>Check Out:</strong> Locks the document so no one else
                can upload a new version. Use this before editing a file
                locally.
              </li>
              <li>
                <strong>Check In:</strong> Uploads your revised file as a new
                version and releases the lock. Uploading a PDF or image
                automatically promotes the document to <em>Final</em> status.
              </li>
              <li>
                <strong>Discard Check Out:</strong> Cancels the lock without
                uploading a new version. Available to the person who checked it
                out, the document owner, or an administrator.
              </li>
            </ul>
            <p className="faq-note">
              <i className="bi bi-info-circle" /> Only documents in{" "}
              <em>Draft</em> status can be checked out. Final documents are
              locked from further editing.
            </p>
          </>
        ),
      },
    ],
  },
  {
    id: "records-retention",
    label: "Records Retention",
    icon: "bi-clock-history",
    items: [
      {
        id: "rr-1",
        question:
          "What is the records lifecycle and what do the statuses mean?",
        answer: (
          <>
            <p>
              Every document follows an ISO-aligned lifecycle based on its
              document type's retention schedule:
            </p>
            <div className="faq-lifecycle">
              <div className="faq-lifecycle-step">
                <span className="faq-badge faq-badge-success">Active</span>
                <span>
                  Document is within its active retention period and is in
                  regular use.
                </span>
              </div>
              <div className="faq-lifecycle-arrow">
                <i className="bi bi-arrow-right" />
              </div>
              <div className="faq-lifecycle-step">
                <span className="faq-badge faq-badge-muted">Inactive</span>
                <span>
                  Active period has elapsed; document is retained for compliance
                  but no longer in active use.
                </span>
              </div>
              <div className="faq-lifecycle-arrow">
                <i className="bi bi-arrow-right" />
              </div>
              <div className="faq-lifecycle-step">
                <span className="faq-badge faq-badge-warning">
                  Ready for Disposition
                </span>
                <span>
                  Both active and inactive periods have elapsed. The document
                  awaits a disposition decision.
                </span>
              </div>
            </div>
            <p>
              Two additional override statuses exist:{" "}
              <strong>Legal Hold</strong> (freezes the lifecycle indefinitely)
              and <strong>Archived / Destroyed</strong> (final disposition
              completed).
            </p>
          </>
        ),
      },
      {
        id: "rr-2",
        question: "What happens during disposition and who can approve it?",
        answer: (
          <>
            <p>
              Disposition requires a two-person authorization to ensure
              separation of duties:
            </p>
            <ol>
              <li>
                An administrator identifies a document that is{" "}
                <em>Ready for Disposition</em> and clicks{" "}
                <strong>Request Disposition Approval</strong>.
              </li>
              <li>
                A <em>different</em> administrator reviews and either{" "}
                <strong>Approves &amp; Executes</strong> or{" "}
                <strong>Rejects</strong> the request.
              </li>
              <li>
                If the disposition action is <strong>Archive</strong>, the
                document is marked as archived but remains in the system. If{" "}
                <strong>Destroy</strong>, the file content is permanently
                deleted from storage; metadata is retained for audit purposes.
              </li>
            </ol>
            <p className="faq-note">
              <i className="bi bi-exclamation-triangle" /> The person who
              requested disposition cannot approve their own request. This is
              enforced by the system.
            </p>
          </>
        ),
      },
      {
        id: "rr-3",
        question: "What is a Legal Hold and when should it be used?",
        answer: (
          <p>
            A Legal Hold freezes a document's lifecycle regardless of its
            retention schedule. It should be applied when a document is subject
            to litigation, audit, or any official investigation that requires
            records to be preserved. Only users with document management
            permission can apply or remove a Legal Hold. A reason must be
            provided when applying the hold.
          </p>
        ),
      },
      {
        id: "rr-4",
        question: "Can I change the retention schedule for existing documents?",
        answer: (
          <p>
            No. Retention schedules are{" "}
            <strong>snapshotted at upload time</strong> — meaning each document
            "remembers" the active and inactive durations that were configured
            for its document type when it was created. Updating the retention
            schedule in the Admin Panel (<em>Records Retention</em>) will only
            affect documents uploaded <em>after</em> the change. This is a
            deliberate compliance safeguard to prevent retroactive modification
            of retention records.
          </p>
        ),
      },
    ],
  },
  {
    id: "access-control",
    label: "Access & Permissions",
    icon: "bi-shield-lock",
    items: [
      {
        id: "ac-1",
        question: "Why can't I see a document that was shared with me?",
        answer: (
          <>
            <p>
              Access to a document is only granted after you actively{" "}
              <strong>Receive</strong> it. If a document was sent to you
              digitally, check the <em>Pending Receipts</em> section in the
              Receive Document dialog. If the document was shared physically
              (via control number), use the control number entry field in the
              same dialog.
            </p>
            <p>
              Additionally, Institutional and Campus classified documents are
              only visible to users within the correct institution or campus
              scope.
            </p>
          </>
        ),
      },
      {
        id: "ac-2",
        question:
          "Why am I unable to send a document with a certain classification?",
        answer: (
          <p>
            Uploading and sending documents with broad classifications
            (Institutional or Campus) requires <strong>Level 1 role</strong> or
            document management permission. Internal documents require{" "}
            <strong>Level 2 or higher</strong>. If you need to broadcast a
            document widely, contact your department head or administrator to
            either elevate your role or upload on your behalf.
          </p>
        ),
      },
      {
        id: "ac-3",
        question: "Who can delete documents?",
        answer: (
          <p>
            Only users with <strong>document management permission</strong>{" "}
            (typically Level 1 or Level 2 roles) can delete documents. Deletion
            is permanent and also removes all associated file versions from
            storage. Documents under a Legal Hold cannot be disposed of but can
            still be deleted by an authorized administrator if the hold is
            removed first.
          </p>
        ),
      },
      {
        id: "ac-4",
        question:
          "Can I grant another user access to my confidential document?",
        answer: (
          <p>
            Yes, by <strong>sending</strong> the document to them. When a
            recipient receives a confidential document, they are granted read
            access. If you need them to be able to edit or upload new versions,
            an administrator can grant write access via the document's access
            control settings. There is no self-service share link — all access
            is tracked through the distribution and audit log system.
          </p>
        ),
      },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    icon: "bi-gear",
    items: [
      {
        id: "adm-1",
        question: "How do I add a new campus or department?",
        answer: (
          <p>
            Navigate to <strong>Admin Panel</strong> (accessible from the
            account dropdown if you have institution-level admin access). Select{" "}
            <em>Campuses</em> to add or edit campus records, and{" "}
            <em>Departments</em> to manage departments within each campus.
            Changes take effect immediately and are reflected in user onboarding
            flows.
          </p>
        ),
      },
      {
        id: "adm-2",
        question:
          "How do I reassign a user to a different department or campus?",
        answer: (
          <p>
            In the <strong>Admin Panel</strong> under <em>System Users</em>,
            locate the user in the campus and department hierarchy. Click{" "}
            <em>Reassign</em> and select the new campus, department, and
            optionally a role. This overrides all previously assigned roles for
            that user. Note that institution-level administrators cannot be
            reassigned this way.
          </p>
        ),
      },
      {
        id: "adm-3",
        question:
          "How do I set up document types and their retention schedules?",
        answer: (
          <>
            <p>
              In the <strong>Admin Panel</strong>, use two separate sections:
            </p>
            <ul>
              <li>
                <em>Document Types</em> — create named types with a color code
                for visual identification (e.g., "Memorandum", "Office Order").
              </li>
              <li>
                <em>Records Retention</em> — configure active duration, inactive
                duration, and disposition action (Archive or Destroy) for each
                type.
              </li>
            </ul>
            <p>
              Remember: retention changes are prospective only and will not
              affect documents already uploaded.
            </p>
          </>
        ),
      },
      {
        id: "adm-4",
        question: "How do I view audit logs?",
        answer: (
          <>
            <p>There are two audit log views depending on your access level:</p>
            <ul>
              <li>
                <strong>Department Logs</strong> (via the sidebar <em>Logs</em>{" "}
                link) — shows all actions taken within your department.
                Filterable by user, action type, and date range.
              </li>
              <li>
                <strong>Master Audit Logs</strong> (via Admin Panel →{" "}
                <em>Master Audit Logs</em>) — institution-wide view across all
                campuses and departments. Available to Super Admins only.
              </li>
            </ul>
          </>
        ),
      },
    ],
  },
  {
    id: "troubleshooting",
    label: "Troubleshooting",
    icon: "bi-wrench",
    items: [
      {
        id: "ts-1",
        question:
          "The control number was not extracted from my document. What should I do?",
        answer: (
          <p>
            Automatic control number extraction uses OCR for PDFs and images,
            and direct text parsing for DOCX files. It looks for the standard
            CSU control number pattern (<code>CSU-…-FL</code>). If the
            extraction fails (e.g., scanned document with poor quality,
            non-standard formatting), simply type the control number manually in
            the provided field before uploading. The field is always editable.
          </p>
        ),
      },
      {
        id: "ts-2",
        question:
          "I cannot check out a document — the option is greyed out. Why?",
        answer: (
          <p>
            Check Out is unavailable if: (1) the document is already in{" "}
            <strong>Final</strong> status — final documents cannot be edited;
            (2) the document is <strong>already checked out</strong> by another
            user; or (3) you do not have write access to the document. Contact
            the document owner or your administrator to resolve access issues.
          </p>
        ),
      },
      {
        id: "ts-3",
        question: "Why is my document not appearing after I uploaded it?",
        answer: (
          <p>
            Try refreshing the Documents page. If the document still does not
            appear, verify that your filter is set to{" "}
            <em>All Institution Documents</em> (or <em>My Documents</em> if you
            want only your own uploads). The document may also be under a
            classification that restricts visibility to certain users. Check the
            uploaded document's classification on its detail page.
          </p>
        ),
      },
      {
        id: "ts-4",
        question: "I signed up but I'm stuck on the 'Join Institution' screen.",
        answer: (
          <p>
            Every new account must complete the institution onboarding before
            accessing the system. If you cannot find your department in the
            list, you can create a new one using the <em>Create new</em> toggle.
            If your campus is missing entirely, contact a Super Administrator to
            add it in the Admin Panel. You will automatically be redirected to
            the Dashboard once the onboarding step is complete.
          </p>
        ),
      },
    ],
  },
];

const FAQPage: React.FC = () => {
  const [activeCategoryId, setActiveCategoryId] = useState("getting-started");
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const activeCategory = FAQ_CATEGORIES.find((c) => c.id === activeCategoryId);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return activeCategory?.items || [];
    const q = searchTerm.toLowerCase();
    return (activeCategory?.items || []).filter((item) =>
      item.question.toLowerCase().includes(q),
    );
  }, [searchTerm, activeCategory]);

  const handleCategoryChange = (id: string) => {
    setActiveCategoryId(id);
    setOpenItemId(null);
    setSearchTerm("");
  };

  const toggleItem = (id: string) => {
    setOpenItemId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="container mt-4">
      <div className="faq-page">
        {/* Page header */}
        <div className="faq-page-header">
          <h2>Help &amp; FAQ</h2>
          <p className="text-muted">
            Find answers to common questions about Plume RMS.
          </p>
        </div>

        <div className="faq-layout">
          {/* Sidebar */}
          <aside className="faq-sidebar">
            <div className="faq-sidebar-label">Categories</div>
            <nav className="faq-sidebar-nav">
              {FAQ_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`faq-sidebar-item ${activeCategoryId === cat.id ? "active" : ""}`}
                  onClick={() => handleCategoryChange(cat.id)}
                >
                  <i className={`bi ${cat.icon}`} />
                  <span>{cat.label}</span>
                  <span className="faq-sidebar-count">{cat.items.length}</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <div className="faq-content">
            {/* Search */}
            <div className="faq-search-wrap">
              <i className="bi bi-search faq-search-icon" />
              <input
                type="text"
                className="faq-search-input"
                placeholder={`Search in ${activeCategory?.label || ""}…`}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setOpenItemId(null);
                }}
              />
              {searchTerm && (
                <button
                  className="faq-search-clear"
                  onClick={() => setSearchTerm("")}
                  aria-label="Clear search"
                >
                  <i className="bi bi-x" />
                </button>
              )}
            </div>

            {/* Category heading */}
            {!searchTerm && (
              <div className="faq-category-heading">
                <i className={`bi ${activeCategory?.icon}`} />
                <span>{activeCategory?.label}</span>
              </div>
            )}

            {/* Accordion */}
            <div className="faq-accordion">
              {filteredItems.length === 0 && (
                <div className="faq-empty">
                  <i className="bi bi-search" />
                  <p>No questions match your search.</p>
                </div>
              )}
              {filteredItems.map((item) => {
                const isOpen = openItemId === item.id;
                return (
                  <div
                    key={item.id}
                    className={`faq-accordion-item ${isOpen ? "open" : ""}`}
                  >
                    <button
                      type="button"
                      className="faq-accordion-trigger"
                      onClick={() => toggleItem(item.id)}
                      aria-expanded={isOpen}
                    >
                      <span className="faq-accordion-question">
                        {item.question}
                      </span>
                      {/* ── Updated: boxed chevron icon ── */}
                      <div className="faq-accordion-chevron">
                        <i
                          className={`bi ${isOpen ? "bi-dash" : "bi-chevron-down"}`}
                        />
                      </div>
                    </button>
                    {isOpen && (
                      <div className="faq-accordion-body">{item.answer}</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="faq-footer-note">
              <i className="bi bi-envelope" />
              <span>
                Can't find what you're looking for? Contact your campus or
                department administrator for assistance.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQPage;
