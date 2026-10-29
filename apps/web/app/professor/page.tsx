import { LiveWorkspace } from "../../components/live-workspace";
import {
  requestedClassroom,
  type ClassroomQuery,
} from "../../lib/classroom-context";
export const metadata = { title: "Espaço do professor · Travessia" };
export default async function TeacherPage({
  searchParams,
}: {
  searchParams: ClassroomQuery;
}) {
  return (
    <LiveWorkspace
      role="professor"
      classroomId={await requestedClassroom(searchParams)}
    />
  );
}
