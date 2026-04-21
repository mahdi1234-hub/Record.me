import AnalyticsDetail from "@/components/analytics/AnalyticsDetail";

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AnalyticsDetail id={id} />;
}
