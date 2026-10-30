import { LiveWorkspace } from "../../../../../components/live-workspace";
export const metadata = { title: "Preparar adaptação · Travessia" };
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ versao?: string | string[] }> }) {
  const { versao } = await searchParams;
  return <LiveWorkspace role="professor" section="adaptacoes" missionId={(await params).id} versionId={typeof versao === "string" ? versao : undefined} />;
}
