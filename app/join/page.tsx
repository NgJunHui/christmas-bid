import type { Metadata } from "next";
import { Suspense } from "react";
import { FormShell } from "@/components/forms/form-shell";
import { JoinRoomForm } from "@/components/forms/join-room-form";

export const metadata: Metadata = { title: "Join a game" };

export default function JoinPage() {
  return (
    <FormShell
      eyebrow="Got a code?"
      title="Join the game"
      subtitle="Enter the Game PIN."
    >
      <Suspense>
        <JoinRoomForm />
      </Suspense>
    </FormShell>
  );
}
