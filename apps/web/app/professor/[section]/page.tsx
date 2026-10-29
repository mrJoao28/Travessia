import { notFound } from "next/navigation";
import { LiveWorkspace } from "../../../components/live-workspace";
import {
  requestedClassroom,
  type ClassroomQuery,
} from "../../../lib/classroom-context";
const titles: Record<string, string> = {
  turmas: "Minhas turmas",
  missoes: "Missões",
  entregas: "Entregas da turma",
  barreiras: "Apoios e barreiras",
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
      role="professor"
      section={section}
      classroomId={await requestedClassroom(searchParams)}
    />
  );
}
