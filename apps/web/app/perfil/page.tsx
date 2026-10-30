import type { Metadata } from "next";
import { LiveProfile } from "../../components/live-profile";

export const metadata: Metadata = { title: "Meu perfil | Travessia" };

export default async function Page({ searchParams }: {
  searchParams: Promise<{ espaco?: string | string[] }>;
}) {
  const { espaco } = await searchParams;
  return <LiveProfile role={espaco === "professor" ? "professor" : "aluno"} />;
}
