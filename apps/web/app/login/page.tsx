import { Brand } from "../../components/icons";
import { LoginForm } from "../../components/login-form";
export const metadata = { title: "Entrar · Travessia" };
export default function LoginPage() {
  return (
    <>
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <main className="login-shell">
        <div className="login-intro">
          <Brand />
          <h1>Um passo de cada vez.</h1>
          <p>
            Aprendizagem com caminhos claros e espaço para o seu jeito de
            aprender.
          </p>
          <p className="small">
            MVP para demonstração · conta e dados dependem da configuração do
            backend.
          </p>
        </div>
        <LoginForm />
      </main>
    </>
  );
}
