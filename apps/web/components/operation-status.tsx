import Link from "next/link";
export function OperationStatus({ message }: { message: string }) {
  return (
    <div>
      <p role="status">{message}</p>
      {message.startsWith("Sua sessão expirou.") && (
        <>
          <Link
            className="text-link"
            href="/login"
            target="_blank"
            rel="noopener noreferrer"
          >
            Entrar novamente em outra aba
          </Link>
          <p className="small">
            Mantenha esta aba aberta para preservar seu texto. Depois de entrar,
            volte e tente salvar novamente.
          </p>
        </>
      )}
    </div>
  );
}
