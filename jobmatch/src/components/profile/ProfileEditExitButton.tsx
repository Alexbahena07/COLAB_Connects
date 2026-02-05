"use client";

import Button from "@/components/ui/Button";

type ProfileEditExitButtonProps = {
  targetId?: string;
};

export default function ProfileEditExitButton({ targetId = "profile-view" }: ProfileEditExitButtonProps) {
  const handleExit = () => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.remove("profile-editing");
    const target = document.getElementById(targetId);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Button
      type="button"
      onClick={handleExit}
      className="btn-outline-brand h-10 !border-white/60! text-white! hover:bg-white/10"
    >
      Back to profile
    </Button>
  );
}
