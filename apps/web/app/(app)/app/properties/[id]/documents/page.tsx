import { listDocumentsAction } from "@/lib/actions/documents";
import { getPropertyAction } from "@/lib/actions/properties";
import { DocumentsList } from "@/components/DocumentsList";

export default async function PropertyDocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [docsResult, propertyResult] = await Promise.all([
    listDocumentsAction(id),
    getPropertyAction(id),
  ]);

  if (docsResult.error) {
    return (
      <div className="rounded-lg border border-red-900/60 bg-red-950/50 p-4 text-sm text-red-200">
        {docsResult.error}
      </div>
    );
  }

  const docs = docsResult.data?.items ?? [];
  const workspaceId = propertyResult.data?.workspace_id ?? "";

  return (
    <div className="space-y-6">
      <DocumentsList
        propertyId={id}
        workspaceId={workspaceId}
        initialDocuments={docs}
      />
    </div>
  );
}


