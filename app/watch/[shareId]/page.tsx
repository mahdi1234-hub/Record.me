import WatchView from "@/components/watch/WatchView";

export default async function WatchPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  return <WatchView shareId={shareId} />;
}
