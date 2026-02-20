// apps/web/src/pages/Account.tsx
import React, { useState, useEffect } from "react";
import { useUser } from "../contexts/SessionContext.tsx";
import { trpc } from "../trpc";
import { Navigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useDropzone } from "react-dropzone";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../supabase";
import "./Account.css";
import { LoadingAnimation } from "../components/ui/LoadingAnimation";
import { formatUserName } from "../utils/user";

// The data our form will manage
type ProfileFormData = {
  firstName: string;
  middleName?: string;
  lastName: string;
};

// The bucket we created
const AVATAR_BUCKET = "avatars";

const Account: React.FC = () => {
  const authUser = useUser(); // This is the Supabase auth user
  const trpcCtx = trpc.useUtils();

  // Get the user profile from *our* database
  const { data: dbUser, isLoading: isLoadingUser } = trpc.user.getMe.useQuery();

  // The new mutation to update the profile
  const { mutate: updateProfile, isPending: isUpdating } =
    trpc.user.updateProfile.useMutation({
      onSuccess: () => {
        // When profile is updated, refresh all user data
        trpcCtx.user.getMe.invalidate();
        alert("Profile updated successfully!");
        // Clear file state after successful upload
        setAvatarFile(null);
        setAvatarPreview(null);
      },
      onError: (error) => {
        alert(`Error updating profile: ${error.message}`);
      },
    });

  // State for the avatar preview
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // react-hook-form setup
  const { register, handleSubmit, setValue } = useForm<ProfileFormData>();

  // This effect loads the user's current name into the form
  useEffect(() => {
    if (dbUser) {
      setValue("firstName", dbUser.firstName || "");
      setValue("middleName", dbUser.middleName || "");
      setValue("lastName", dbUser.lastName || "");
    }
  }, [dbUser, setValue]);

  // This effect creates a local preview of the new avatar
  useEffect(() => {
    if (avatarFile) {
      const previewUrl = URL.createObjectURL(avatarFile);
      setAvatarPreview(previewUrl);
      // Clean up the object URL when the component unmounts
      return () => URL.revokeObjectURL(previewUrl);
    }
  }, [avatarFile]);

  // Dropzone setup
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles[0]) {
        setAvatarFile(acceptedFiles[0]);
      }
    },
    accept: { "image/jpeg": [], "image/png": [] },
    multiple: false,
  });

  // --- Form Submit Handler ---
  const onSubmit = async (formData: ProfileFormData) => {
    if (!dbUser) return;

    let newAvatarUrl: string | undefined = undefined;

    // 1. If user selected a new avatar, upload it first
    if (avatarFile) {
      const fileExtension = avatarFile.name.split(".").pop();
      const storageKey = `${dbUser.id}/${uuidv4()}.${fileExtension}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(storageKey, avatarFile, {
          cacheControl: "3600",
          upsert: true, // Overwrite existing avatar
        });

      if (uploadError) {
        alert(`Error uploading avatar: ${uploadError.message}`);
        return;
      }

      // 2. Get the public URL of the newly uploaded file
      const { data: urlData } = supabase.storage
        .from(AVATAR_BUCKET)
        .getPublicUrl(uploadData.path);

      newAvatarUrl = urlData.publicUrl;
    }

    // 3. Call the tRPC mutation to save the new name and/or URL
    updateProfile({
      firstName: formData.firstName,
      middleName: formData.middleName || undefined,
      lastName: formData.lastName,
      ...(newAvatarUrl && { imageUrl: newAvatarUrl }),
    });
  };

  // --- Loading and Auth States ---
  if (isLoadingUser) {
    return <LoadingAnimation />;
  }

  if (!authUser || !dbUser) {
    return <Navigate to="/login" replace />;
  }

  // Determine the current avatar to display
  const currentAvatar =
    avatarPreview || // 1. The new local preview
    dbUser.imageUrl || // 2. The URL from our database (this now exists)
    authUser.user_metadata?.avatar_url || // 3. The URL from Supabase auth
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      formatUserName(dbUser),
    )}`;

  return (
    <div className="container mt-4">
      <div className="page-header">
        <h2>My Account</h2>
      </div>

      {/* We re-use our consistent card style */}
      <div className="document-table-card">
        <form
          className="account-form-wrapper"
          onSubmit={handleSubmit(onSubmit)}
        >
          {/* Avatar Uploader Section */}
          <div className="form-group avatar-group">
            <label>Profile Picture</label>
            <div className="avatar-uploader">
              <img
                src={currentAvatar}
                alt="Profile Avatar"
                className="avatar-preview"
              />
              <div
                {...getRootProps()}
                className={`avatar-dropzone ${isDragActive ? "active" : ""}`}
              >
                <input {...getInputProps()} />
                <i className="bi bi-camera-fill"></i>
                <span>{isDragActive ? "Drop" : "Change"}</span>
              </div>
            </div>
          </div>

          {/* User Details Section */}
          <div className="form-group">
            <label htmlFor="firstName">First Name</label>
            <input
              id="firstName"
              type="text"
              className="form-control"
              {...register("firstName", { required: "First name is required" })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="middleName">Middle Name</label>
            <input
              id="middleName"
              type="text"
              className="form-control"
              {...register("middleName")}
            />
          </div>

          <div className="form-group">
            <label htmlFor="lastName">Last Name</label>
            <input
              id="lastName"
              type="text"
              className="form-control"
              {...register("lastName", { required: "Last name is required" })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="form-control"
              value={dbUser.email}
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">Role</label>
            <input
              id="role"
              type="text"
              className="form-control"
              value={dbUser.roles?.map((r) => r.name).join(", ") || "User"}
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="org">Organization</label>
            <input
              id="org"
              type="text"
              className="form-control"
              value={dbUser.organization?.name || "N/A"}
              disabled
            />
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isUpdating}
            >
              {isUpdating ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Account;
