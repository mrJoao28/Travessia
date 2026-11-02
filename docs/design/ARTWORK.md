# Artes do Travessia

## Procedência

O usuário forneceu `public.zip` com a identidade Mais Acesso Conecta e solicitou a criação de artes complementares para o Travessia. Foram incorporados apenas o logo e a ilustração de autenticação pertinentes. Fotos, documentos, planilhas e logos de clientes/parceiros do ZIP não foram importados.

| Arquivo em apps/web/public/brand | Origem | Uso |
|---|---|---|
| mais-acesso-conecta.png | public/mais-acesso-logo.png, fornecido pelo usuário | Assinatura da plataforma |
| mais-acesso-conecta-dark.png | Variante local do logo original; azul ajustado a #8CC8FF e detalhes neutros a #F3F6F8, com transparência preservada | Assinatura no tema escuro |
| mais-acesso-auth.webp | public/professor/auth-illustration.png, fornecido pelo usuário | Login |
| mais-acesso-auth-dark.webp | Variante local com fundo escuro e sombras levantadas | Login no tema escuro |
| learning-together.webp | Nova arte gerada com a ferramenta image_gen integrada | Home aluno, real e prévia |
| learning-together-dark.webp | Variante local com fundo escuro e detalhes ajustados para leitura | Home aluno no tema escuro |
| teaching-pathways.webp | Nova arte gerada com a ferramenta image_gen integrada | Visão docente, real e prévia |
| teaching-pathways-dark.webp | Variante local com fundo escuro e detalhes ajustados para leitura | Visão docente no tema escuro |

As duas novas artes foram geradas individualmente, usando `professor/auth-illustration.png` e `landing/hero-illustration.png` como referências visuais. Imagens geradas: 1536 × 1024. Conversão local para WebP com qualidade 88, preservando a composição. As quatro variantes escuras são derivadas localmente com segmentação de fundo e ajuste de paleta; não alteram composição ou conteúdo. Os arquivos claros originais permanecem intactos. A variante escura do logo mantém o alpha e os elementos da marca, clareando o azul para leitura sobre superfícies escuras. `ThemeImage` escolhe a variante de acordo com o tema atual; `ThemeBootstrap` reaplica a escolha salva também na tela de login. Novas artes e imagens decorativas não transmitem informação indispensável; o HTML contém todas as instruções, objetivos e progresso.

## Prompt — learning-together

Use case: illustration-story. Create ONE original landscape editorial illustration for the university learning app Travessia, a companion to Mais Acesso Conecta. The attached images are style references only; create a new composition. Match their clean contemporary flat illustration, white background, navy outlines, medium azure blue #3779BF, deep navy #15395B, warm yellow #F6BE35 accents, pale blue abstract organic shapes, subtle soft shading, adult proportions, friendly restrained university mood. Show three adult university students collaborating around a shared table: a young Black woman using a laptop, a young male wheelchair user contributing notes, and another student comparing a book and a tablet. Everyone participates actively as peers. Include a small bookshelf, a plant and an abstract path of small blue dots suggesting learning progress, all understated. Devices show only abstract shapes, no charts or numbers. Frame the whole scene comfortably with ample white margins. Image used in the right column of an academic dashboard and login; visually clear at small sizes. No lettering, words, logo, watermark, UI screenshots, floating trophy, confetti or childish style. Output a polished coherent illustration, landscape 3:2.

## Prompt — teaching-pathways

Use case: illustration-story. Generate ONE new original landscape illustration for the professor workspace in the university learning platform Travessia. Input images are STYLE REFERENCES, not edit targets. Match Mais Acesso Conecta's polished flat editorial artwork: white background, medium blue #3779BF, dark navy #15395B, pale blue organic background accents, warm yellow #F6BE35 highlights, subtle restrained shading, mature university style. Scene: a woman university professor with dark brown skin and glasses sits comfortably at a desk planning an accessible lesson on a laptop; an adult student beside her points to three simple blank cards arranged on a freestanding board. Cards suggest stages of a learning mission via simple unlabelled book, pencil, check pictograms. Show shared planning and agency, adult proportions, natural hands, one small plant and books. Keep objects large and uncomplicated, ample white breathing room. Whole composition visible, landscape 3:2, designed to fit right side of a compact dashboard welcome panel. No text, letters, numbers, logo, watermark, trophy, fireworks, gradients, full UI screenshot, or childish appearance. Same coherent blue and yellow visual family as references.


## Capturas da interface

A pasta previews contém capturas reais do CI 40979783560, convertidas para WebP sem perdas: student-desktop.webp, student-mobile.webp, teacher-desktop.webp e login-desktop.webp. São evidências da interface implementada com dados fictícios; não são mockups gerados por IA. As ilustrações criadas com image_gen estão apenas em apps/web/public/brand.
