import { LiveWorkspace } from "../../../../components/live-workspace";
export const metadata = { title: "Missão · Travessia" };
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <LiveWorkspace
      role="aluno"
      section="missao"
      missionId={(await params).id}
    />
  );
}
