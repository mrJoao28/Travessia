import { notFound } from "next/navigation";
import { Workspace } from "../../../../components/workspace";
import { StudentHomePreview } from "../../../../components/student-home";
import { PreviewFlows } from "../../../../components/preview-flows";

export const metadata = {
  title: "Prévia de interface · Travessia",
  robots: { index: false, follow: false },
};
export default async function PreviewPage({
  params,
}: {
  params: Promise<{ role: string; path?: string[] }>;
}) {
  const { role, path = [] } = await params;
  if (role !== "aluno" && role !== "professor") notFound();
  const route = path.join("/");
  const allowed =
    role === "aluno"
      ? [
          "",
          "turmas",
          "entregas",
          "feedback",
          "barreiras",
          "missoes/biblioteca",
          "ajuda",
        ]
      : ["", "missoes", "missoes/editor", "entregas", "barreiras", "ajuda"];
  if (!allowed.includes(route)) notFound();
  return (
    <Workspace role={role} preview>
      {role === "aluno" && !route ? (
        <StudentHomePreview />
      ) : (
        <PreviewFlows role={role} route={route} />
      )}
    </Workspace>
  );
}
