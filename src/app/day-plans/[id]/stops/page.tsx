import { redirect } from 'next/navigation';

export default async function DayPlanStopsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/day-plans/${id}/edit#stops`);
}
