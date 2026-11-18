import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResultsScreen } from "@/components/results/results-screen";

export const metadata: Metadata = { title: "Thank you" };

export default async function ResultsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^\d{4}$/.test(code)) notFound();
  return <ResultsScreen code={code} />;
}
