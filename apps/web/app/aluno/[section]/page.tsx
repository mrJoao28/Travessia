import { notFound } from "next/navigation";
import { LiveWorkspace } from "../../../components/live-workspace";
import {
  requestedClassroom,
  type ClassroomQuery,
} from "../../../lib/classroom-context";
const titles: Record<string, string> = {
  barreiras: "Meus relatos e respostas",
  turmas: "Minhas turmas",
  entregas: "Minhas entregas",
  feedback: "Feedback",
  ajuda: "Ajuda",
};
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: ClassroomQuery;
}) {
  const { section } = await params;
  if (!titles[section]) notFound();
  return (
    <LiveWorkspace
      role="aluno"
      section={section}
      classroomId={await requestedClassroom(searchParams)}
    />
  );
}
