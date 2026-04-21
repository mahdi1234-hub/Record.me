import EmbedView from "@/components/embed/EmbedView";

export const dynamic = "force-dynamic";

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  return <EmbedView shareId={shareId} />;
}
