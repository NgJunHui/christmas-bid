import type { Metadata } from "next";
import { CreateRoomForm } from "@/components/forms/create-room-form";
import { FormShell } from "@/components/forms/form-shell";

export const metadata: Metadata = { title: "Host a game" };

export default async function CreatePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  // `?timer=` only takes effect when the server has test timers enabled (local e2e runs).
  const timer = Number((await searchParams).timer);
  return (
    <FormShell
      title="Let's get the party started"
      subtitle="Get everyone together and let the bidding begin."
    >
      <CreateRoomForm testBiddingSeconds={Number.isInteger(timer) && timer > 0 ? timer : undefined} />
    </FormShell>
  );
}
