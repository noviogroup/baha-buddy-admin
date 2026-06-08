import Link from 'next/link';
import { DayStopManager } from '@/components/day-stop-manager';

export default async function EditStopsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-surface/40 p-6 font-body">
      <div className="mb-5 rounded-xl border border-hairline bg-white p-5 shadow-card baha-gradient-card">
        <Link
          href={`/day-plans/${id}/edit#stops`}
          className="text-xs font-bold text-brand-blue hover:underline"
        >
          ← Back to Guide Editor
        </Link>

        <h1 className="mt-4 text-2xl font-display font-bold text-ink tracking-tight">
          Edit Guide Stops
        </h1>

        <p className="mt-2 text-sm text-body">
          Use this focused screen to update existing stops and route order.
        </p>
      </div>

      <DayStopManager planId={id} />
    </main>
  );
}
