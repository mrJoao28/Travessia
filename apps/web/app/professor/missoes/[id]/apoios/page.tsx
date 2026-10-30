import { LiveWorkspace } from "../../../../../components/live-workspace";
export const metadata = { title: "Apoios da missão · Travessia" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <LiveWorkspace role="professor" section="apoios" missionId={(await params).id} />;
}
