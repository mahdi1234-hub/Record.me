import EditorView from "@/components/editor/EditorView";

export default async function EditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditorView id={id} />;
}
