import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RoomScreen } from "@/components/game/room-screen";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  return { title: `Room ${code}` };
}

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^\d{4}$/.test(code)) notFound();
  return <RoomScreen code={code} />;
}
