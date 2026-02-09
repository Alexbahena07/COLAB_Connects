"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";

type FollowCompanyButtonProps = {
  companyId: string;
  initialIsFollowing: boolean;
};

export default function FollowCompanyButton({
  companyId,
  initialIsFollowing,
}: FollowCompanyButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleFollow = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/companies/${companyId}/follow`, {
        method: isFollowing ? "DELETE" : "POST",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          typeof payload?.error === "string"
            ? payload.error
            : "We couldn't update your follow status.";
        setError(message);
        return;
      }

      setIsFollowing((current) => !current);
    } catch (followError) {
      console.error("Failed to update company follow status", followError);
      setError("We couldn't update your follow status.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1 md:items-end">
      <Button
        type="button"
        onClick={toggleFollow}
        isLoading={isSaving}
        className={
          isFollowing
            ? "btn-outline-brand h-10 border-white/60! text-white! hover:bg-white/10"
            : "btn-brand h-10"
        }
      >
        {isFollowing ? "Following" : "Follow company"}
      </Button>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
