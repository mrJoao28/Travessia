import Image from "next/image";
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
          <Image
            className="login-art decorative"
            src="/brand/mais-acesso-auth.webp"
            width={512}
            height={512}
            sizes="(max-width: 800px) 1px, 34vw"
            alt=""
          />
          <div className="login-network">
            <Image
              src="/brand/mais-acesso-conecta.png"
              width={132}
              height={66}
              alt="Mais Acesso Conecta"
            />
            <p className="small">Educação inclusiva. Diferentes caminhos para aprender.</p>
          </div>
        </div>
        <LoginForm />
      </main>
    </>
  );
}
