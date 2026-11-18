import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hello | christmas-bid",
};

export default function HelloPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-950">
      <div className="flex max-w-xl flex-col items-center gap-4 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-orange-600">
          Live on Cloudflare Workers
        </p>
        <h1 className="text-4xl font-semibold sm:text-5xl">Hello from the edge 👋</h1>
        <p className="text-lg leading-8 text-slate-700">
          This page lives in <code className="rounded bg-slate-100 px-1.5 py-0.5">app/hello/page.tsx</code>.
          Edit it, push, and redeploy.
        </p>
        <a
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100"
          href="/"
        >
          ← Back home
        </a>
      </div>
    </main>
  );
}
