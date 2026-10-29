import { LiveWorkspace } from "../../../../components/live-workspace";
export const metadata = { title: "Consultar missão · Travessia" };
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <LiveWorkspace
      role="professor"
      section={id === "nova" ? "nova" : "missao"}
      missionId={id === "nova" ? undefined : id}
    />
  );
}
