import { LiveWorkspace } from "../../components/live-workspace";
import {
  requestedClassroom,
  type ClassroomQuery,
} from "../../lib/classroom-context";
export const metadata = { title: "Meu percurso · Travessia" };
export default async function StudentPage({
  searchParams,
}: {
  searchParams: ClassroomQuery;
}) {
  return (
    <LiveWorkspace
      role="aluno"
      classroomId={await requestedClassroom(searchParams)}
    />
  );
}
