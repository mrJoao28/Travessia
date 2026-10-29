import { notFound } from "next/navigation";
import { LiveWorkspace } from "../../../components/live-workspace";
const titles: Record<string, string> = {
  barreiras: "Meus relatos e respostas",
  turmas: "Minhas turmas",
  entregas: "Minhas entregas",
  feedback: "Feedback",
  ajuda: "Ajuda",
};
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!titles[section]) notFound();
  return <LiveWorkspace role="aluno" section={section} />;
}
