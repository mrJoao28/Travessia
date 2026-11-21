import { LiveWorkspace } from "../../../../components/live-workspace";
import {
  requestedClassroom,
  type ClassroomQuery,
} from "../../../../lib/classroom-context";
export const metadata = { title: "Consultar atividade · Travessia" };
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: ClassroomQuery;
}) {
  const { id } = await params;
  return (
    <LiveWorkspace
      role="professor"
      section={id === "nova" ? "nova" : "atividade"}
      missionId={id === "nova" ? undefined : id}
      classroomId={await requestedClassroom(searchParams)}
    />
  );
}
