import Image from "next/image";
import { Brand } from "./icons";

export function AuthIntro({ teacher = false }: { teacher?: boolean }) {
  return <aside className="login-intro registration-intro" aria-label="Travessia">
    <Brand />
    <p className="auth-intro-title">Um passo de cada vez.</p>
    <p>Diferentes caminhos para aprender.</p>
    <Image className="login-art decorative" src={teacher ? "/brand/teaching-pathways.webp" : "/brand/learning-together.webp"}
      width={768} height={768} sizes="(max-width: 800px) 1px, 42vw" alt="" />
    <div className="login-network">
      <Image src="/brand/mais-acesso-conecta.png" width={132} height={66} alt="Mais Acesso Conecta" />
      <p className="small">Educação inclusiva. Diferentes caminhos para aprender.</p>
    </div>
  </aside>;
}
