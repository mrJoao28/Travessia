import { Brand } from "../../components/icons";
import { LoginForm } from "../../components/login-form";
import { ThemeImage } from "../../components/theme-image";
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
          <ThemeImage
            className="login-art decorative"
            lightSrc="/brand/mais-acesso-auth.webp"
            darkSrc="/brand/mais-acesso-auth-dark.webp"
            width={512}
            height={512}
            sizes="(max-width: 800px) 1px, 34vw"
            alt=""
          />
          <div className="login-network">
            <ThemeImage
              lightSrc="/brand/mais-acesso-conecta.png"
              darkSrc="/brand/mais-acesso-conecta-dark.png"
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
