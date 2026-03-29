import React, { useState, useEffect } from "react";
import { useUser } from "../contexts/SessionContext.tsx";
import { trpc } from "../trpc";
import { Navigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useDropzone } from "react-dropzone";
import { usePermissions } from "../hooks/usePermissions";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../supabase.ts";
import { AlertModal } from "../components/AlertModal";
import "./Account.css";

import { formatUserName } from "../utils/user";

type ProfileFormData = {
  firstName: string;
  middleName?: string;
  lastName: string;
};

const AVATAR_BUCKET = "avatars";

const Account: React.FC = () => {
  const authUser = useUser();
  const trpcCtx = trpc.useUtils();
  const [alertConfig, setAlertConfig] = useState<{
    show: boolean;
    title: string;
    message: string;
  }>({ show: false, title: "", message: "" });

  const { data: dbUser, isLoading } = trpc.user.getMe.useQuery();
  const { canManageInstitution } = usePermissions();

  const { mutate: updateProfile, isPending: isUpdating } =
    trpc.user.updateProfile.useMutation({
      onSuccess: () => {
        trpcCtx.user.getMe.invalidate();
      },
      onError: (error: { message: any }) =>
        setAlertConfig({
          show: true,
          title: "Error",
          message: `Error: ${error.message}`,
        }),
    });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const { register, handleSubmit, setValue } = useForm<ProfileFormData>();

  useEffect(() => {
    if (dbUser) {
      setValue("firstName", dbUser.firstName || "");
      setValue("middleName", dbUser.middleName || "");
      setValue("lastName", dbUser.lastName || "");
    }
  }, [dbUser, setValue]);

  useEffect(() => {
    if (avatarFile) {
      const url = URL.createObjectURL(avatarFile);
      setAvatarPreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [avatarFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => {
      if (files[0]) setAvatarFile(files[0]);
    },
    accept: { "image/jpeg": [], "image/png": [] },
    multiple: false,
  });

  const onSubmit = async (data: ProfileFormData) => {
    if (!dbUser) return;
    let imageUrl: string | undefined;

    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop();
      const key = `${dbUser.id}/${uuidv4()}.${ext}`;
      const { data: uploaded, error } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(key, avatarFile, { upsert: true });
      if (error) {
        setAlertConfig({
          show: true,
          title: "Avatar Upload Failed",
          message: (error as Error).message,
        });
        return;
      }
      const { data: urlData } = supabase.storage
        .from(AVATAR_BUCKET)
        .getPublicUrl(uploaded.path);
      imageUrl = urlData.publicUrl;
    }

    updateProfile({
      firstName: data.firstName,
      middleName: data.middleName || undefined,
      lastName: data.lastName,
      ...(imageUrl && { imageUrl }),
    });
  };

  if (isLoading) return null;
  if (!authUser || !dbUser) return <Navigate to="/login" replace />;

  const displayName = formatUserName(dbUser);
  const currentAvatar =
    avatarPreview ||
    dbUser.imageUrl ||
    authUser.user_metadata?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=9B2335&color=fff&size=128`;

  return (
    <div className="container mt-2 account-page">
      <div className="page-header">
        <h2>My Account</h2>
      </div>

      {/* Profile card with banner */}
      <div className="account-profile-card">
        <div className="account-profile-banner">
          <div className="account-profile-avatar-wrap">
            <div className="account-avatar-uploader">
              <img
                src={currentAvatar}
                alt="avatar"
                className="account-avatar-img"
              />
              <div
                {...getRootProps()}
                className={`account-avatar-overlay ${isDragActive ? "active" : ""}`}
              >
                <input {...getInputProps()} />
                <i className="bi bi-camera" />
                <span>Change</span>
              </div>
            </div>
          </div>
        </div>
        <div className="account-profile-body">
          <div className="account-profile-name">{displayName}</div>
          <div className="account-profile-role">
            {dbUser.roles?.map((r: { id: string; name: string }) => (
              <span key={r.id} className="badge bg-secondary">
                {r.name}
              </span>
            ))}
            {canManageInstitution && (
              <span className="badge bg-danger">System Administrator</span>
            )}
          </div>
        </div>
      </div>

      {/* Edit form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="account-form-card">
          <div className="account-form-card-header">Personal information</div>
          <div className="account-form-card-body">
            <div className="account-field-row">
              <div>
                <label className="form-label">First name</label>
                <input
                  type="text"
                  className="form-control"
                  {...register("firstName", { required: true })}
                />
              </div>
              <div>
                <label className="form-label">Last name</label>
                <input
                  type="text"
                  className="form-control"
                  {...register("lastName", { required: true })}
                />
              </div>
            </div>
            <div>
              <label className="form-label">
                Middle name{" "}
                <span
                  style={{
                    color: "var(--text-muted)",
                    fontWeight: 400,
                    fontSize: "11px",
                  }}
                >
                  optional
                </span>
              </label>
              <input
                type="text"
                className="form-control"
                {...register("middleName")}
              />
            </div>
          </div>
          <div className="account-form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isUpdating}
            >
              {isUpdating ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </form>

      {/* Read-only info */}
      <div className="account-form-card">
        <div className="account-form-card-header">Account details</div>
        <div className="account-form-card-body" style={{ gap: 0 }}>
          <div className="account-info-row">
            <span className="account-info-label">Email</span>
            <span className="account-info-value">{dbUser.email}</span>
          </div>
          <div className="account-info-row">
            <span className="account-info-label">Institution</span>
            <span className="account-info-value">
              {dbUser.institution?.name || "—"}
            </span>
          </div>
          <div className="account-info-row">
            <span className="account-info-label">Campus</span>
            <span className="account-info-value">
              {dbUser.campus?.name || "—"}
            </span>
          </div>
          <div className="account-info-row">
            <span className="account-info-label">Department</span>
            <span className="account-info-value">
              {dbUser.department?.name || "—"}
            </span>
          </div>
        </div>
      </div>

      <AlertModal
        show={alertConfig.show}
        title={alertConfig.title}
        onClose={() => setAlertConfig({ ...alertConfig, show: false })}
      >
        {alertConfig.message}
      </AlertModal>
    </div>
  );
};

export default Account;
