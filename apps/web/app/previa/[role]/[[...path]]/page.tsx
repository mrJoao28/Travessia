import { notFound } from "next/navigation";
import { Workspace } from "../../../../components/workspace";
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
  const common = ["", "turmas", "entregas", "feedback", "barreiras", "primeiros-passos", "ajuda", "perfil", "apoios"];
  const dynamic = role === "aluno" ? /^missoes\/[a-zA-Z0-9-]{1,100}$/ : /^missoes\/[a-zA-Z0-9-]{1,100}\/(editor|adaptacoes|apoios|estrategias)$/;
  if (!common.includes(route) && !(role === 'professor' && ['missoes','missoes/editor'].includes(route)) && !dynamic.test(route)) notFound();
  return (
    <Workspace role={role} preview>
      <PreviewFlows role={role} route={route} />
    </Workspace>
  );
}
