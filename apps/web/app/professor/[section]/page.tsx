import { notFound } from "next/navigation";
import { LiveWorkspace } from "../../../components/live-workspace";
const titles: Record<string, string> = {
  turmas: "Minhas turmas",
  missoes: "Missões",
  entregas: "Entregas da turma",
  barreiras: "Apoios e barreiras",
  ajuda: "Ajuda",
};
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!titles[section]) notFound();
  return <LiveWorkspace role="professor" section={section} />;
}
