import { DayPlanEditor } from '@/components/day-plan-editor';

export default async function DayPlanEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-surface/40 p-6 font-body">
      <DayPlanEditor planId={id} />
    </main>
  );
}
