import Link from 'next/link';

export default async function DayPlanStopsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-surface/40 p-6 font-body">
      <div className="bg-white rounded-xl border border-hairline p-6 shadow-card baha-gradient-card">
        <Link href="/" className="text-xs font-bold text-brand-blue hover:underline">← Back to Command Center</Link>
        <h1 className="mt-4 text-2xl font-display font-bold text-ink tracking-tight">Manage Guided Day Stops</h1>
        <p className="mt-2 text-sm text-body max-w-3xl leading-relaxed">
          Plan ID: <span className="font-mono text-ink">{id}</span>
        </p>
        <p className="mt-2 text-sm text-body max-w-3xl leading-relaxed">
          This page is the placeholder for stop CRUD, route preview, and live-guide readiness checks. The API endpoint is available at <span className="font-mono text-ink">/api/day-plans/{id}/stops</span>.
        </p>
      </div>
    </main>
  );
}
