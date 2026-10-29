import { LiveWorkspace } from "../../../../../components/live-workspace";
export const metadata = { title: "Editar missão · Travessia" };
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <LiveWorkspace
      role="professor"
      section="editor"
      missionId={(await params).id}
    />
  );
}
