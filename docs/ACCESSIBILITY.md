# Acessibilidade desde a base

## Escopo e evidência

Alvo técnico: **WCAG 2.2 nível AA**. Acrescentar padrões W3C COGA para atenção, memória, compreensão e orientação. COGA é orientação suplementar, não certificação nem protocolo clínico. A fonte educacional especializada do usuário está pendente em REFERENCES.md. O projeto não promete atender todas as necessidades nem considera uma condição um conjunto fixo de preferências.

## Requisitos por barreira

| Barreira | Requisito de produto |
|---|---|
| Baixa visão | Texto ampliável, contraste verificável, zoom/reflow, espaçamento ajustável e suporte a cores do sistema |
| Cegueira | HTML semântico, nomes acessíveis, ordem de leitura, alternativas textuais e mensagens compreensíveis em leitor de tela |
| Atenção/TDAH e memória | Etapas curtas e identificadas, contexto de retomada, instruções claras, ausência de pressão e decoração reduzível |
| Leitura e processamento | Blocos curtos, termos explicados, exemplos e instruções por ação; preservar rigor e objetivos |
| Motora | Teclado integral, alvos amplos, alternativa ao arrastar, sem gestos obrigatórios |
| Auditiva | Legendas/transcrições conforme o conteúdo; equivalentes das instruções em áudio |
| Vestibular/fotossensibilidade | Sem flashes, autoplay ou movimento essencial; respeitar prefers-reduced-motion |

Não usar rótulos como “modo TDAH” para impor um layout. Todo usuário pode escolher os apoios. Não exigir laudo. Leitura em voz alta e transcrição são funcionalidades a avaliar posteriormente; não há promessa de Libras automática confiável ou conversão de qualquer PDF em documento acessível.

## Critérios de implementação

- Idioma pt-BR, títulos únicos, uma hierarquia coerente de cabeçalhos, landmarks e link de pular conteúdo.
- Operação completa por teclado; foco visível e não encoberto. Controles móveis com alvo de projeto de 44×44 CSS px; distinguir essa escolha do mínimo AA de 24×24 com exceções em 2.5.8.
- Contraste mínimo 4.5:1 para texto normal, 3:1 para texto grande e componentes/informação gráfica aplicáveis. Cor nunca é o único sinal de estado.
- Redimensionar texto a 200%; reflow equivalente a 320 CSS px/zoom de 400% sem perda de informação, salvo exceções do critério. Evitar alturas fixas que cortem conteúdo.
- Suportar aumento de entrelinha, espaçamento de parágrafos/palavras/letras sem perda; testar texto expandido e traduções futuras.
- Formulários com labels, instruções prévias, erros vinculados ao campo, resumo e recuperação sem apagar o trabalho. Permitir colar senhas e usar gerenciador; autenticação sem teste cognitivo obrigatório sem alternativa.
- Não anunciar cada mudança de progresso/keystroke em live region. Feedback de envio e falha deve ser perceptível sem mover foco desnecessariamente.
- Conteúdo didático: explicar objetivo, ação, entrega e critério; disponibilizar alternativas apropriadas e revisão humana. Arquivos de professor também precisam de verificação/alternativa; a interface acessível não torna um PDF escaneado acessível.
- Sem diagnósticos ou inferência de deficiência a partir de comportamento, uso ou nota. Adaptação pedagógica não reduz automaticamente o objetivo avaliado.

## Roteiro manual de aceitação por fluxo

1. Concluir o fluxo só com Tab, Shift+Tab, Enter, Espaço, setas quando aplicável e Escape para diálogos.
2. Confirmar posição e retorno de foco; todos os controles devem ter nome e função claros.
3. Ler página e executar ação com NVDA/Firefox ou Chrome e VoiceOver/Safari quando disponíveis. Anotar ambiente e resultado, não presumir teste realizado.
4. Testar 200% de texto, 400% de zoom/reflow, viewport 320px e espaçamento personalizado.
5. Testar contraste normal/ampliado, forced-colors e prefers-reduced-motion.
6. Interromper e retomar uma atividade; confirmar contexto preservado sem depender de memória.
7. Testar erro, demora e sessão expirada, com aviso prévio e possibilidade de preservar trabalho.
8. Validar com pessoas com diferentes necessidades, com consentimento e sem coleta clínica desnecessária. Registrar barreira, correção e revalidação.

## Estado inicial

Implementados no protótipo: semântica básica, skip link, controles nativos, preferências locais, reflow responsivo e ausência de animação. Automatizados: axe em três rotas, preferências por teclado e viewport estreito. Registrar a execução no PR; **testes automáticos não bastam para afirmar conformidade WCAG ou eficácia pedagógica**. Login, uploads, editor, entregas e leitura por tecnologia assistiva serão verificados ao serem implementados.
