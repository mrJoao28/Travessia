import Link from "next/link";
export default function NotFound() {
  return (
    <main className="paper lesson-reader" style={{ margin: "2rem auto" }}>
      <h1>Este caminho não foi encontrado.</h1>
      <p>Volte ao início para continuar.</p>
      <Link className="button" href="/">
        Ir ao início
      </Link>
    </main>
  );
}
