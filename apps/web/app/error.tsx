"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="paper lesson-reader" style={{ margin: "2rem auto" }}>
      <h1>Não foi possível abrir esta página.</h1>
      <p>Tente carregar novamente. Nenhuma operação foi confirmada.</p>
      <button className="button" onClick={reset}>
        Tentar novamente
      </button>
    </main>
  );
}
