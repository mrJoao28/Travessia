import { WelcomeScreen } from "../../components/welcome-screen";
export const metadata = { title: "Primeiros passos · Travessia" };
export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ espaco?: string | string[] }> }) {
  const { espaco } = await searchParams;
  return <WelcomeScreen initialSpace={espaco === "professor" ? "professor" : "aluno"} />;
}
