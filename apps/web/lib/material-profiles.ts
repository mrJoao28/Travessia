// Suggestions, never diagnoses or automatic changes to learning objectives.
export const materialSupports = [
  { id: 'large-print', label: 'Texto ampliado', hint: 'Tamanho ajustável e páginas sem colunas.' },
  { id: 'wide-spacing', label: 'Mais espaço para leitura', hint: 'Entrelinhas e parágrafos mais espaçados.' },
  { id: 'high-contrast', label: 'Contraste de leitura', hint: 'Escolha as cores; nenhuma informação depende só de cor.' },
  { id: 'literal-language', label: 'Linguagem direta', hint: 'Explicar expressões e preservar conceitos, números e objetivos.' },
  { id: 'short-sections', label: 'Seções curtas e previsíveis', hint: 'Uma ação por bloco, com títulos claros.' },
  { id: 'glossary', label: 'Explicar termos', hint: 'Explicações junto aos conceitos, sujeitas à revisão.' },
  { id: 'image-description', label: 'Descrição das imagens', hint: 'A IA recebe somente as páginas selecionadas. Revise gráficos, tabelas e fórmulas.' },
  { id: 'narration', label: 'Áudio com transcrição', hint: 'Voz sintética local, sem envio do texto a um serviço de voz.' },
] as const;
export type MaterialSupport = typeof materialSupports[number]['id'];
export const materialProfiles: { id: string; label: string; supports: MaterialSupport[]; note: string }[] = [
  { id: 'blindness', label: 'Cegueira', supports: ['image-description', 'narration'], note: 'Oferecer HTML com títulos e ordem de leitura, além do PDF e áudio. Conferir descrições com o aluno.' },
  { id: 'low-vision', label: 'Baixa visão', supports: ['large-print', 'wide-spacing', 'high-contrast'], note: 'Tamanho, cores e espaçamento dependem da preferência individual; confirme com o aluno.' },
  { id: 'color-vision', label: 'Percepção de cores / daltonismo', supports: ['high-contrast', 'image-description'], note: 'Descrever relações de gráficos sem depender somente das cores.' },
  { id: 'deafness', label: 'Surdez', supports: ['short-sections', 'glossary'], note: 'Manter toda a informação em texto. Português escrito e áudio não substituem Libras.' },
  { id: 'hard-of-hearing', label: 'Perda auditiva parcial', supports: ['short-sections'], note: 'Transcrição sempre disponível. Áudio é opcional e tem controles de reprodução.' },
  { id: 'autism', label: 'Transtorno do espectro autista (TEA)', supports: ['literal-language', 'short-sections'], note: 'Confirmar linguagem, previsibilidade e necessidade de mediação. Não reduzir objetivos com base em nível de suporte.' },
  { id: 'dyslexia', label: 'Dislexia', supports: ['wide-spacing', 'short-sections', 'narration'], note: 'Espaçamento e leitura em voz alta podem ajudar algumas pessoas; não existe fonte universal para dislexia.' },
  { id: 'adhd', label: 'TDAH', supports: ['short-sections'], note: 'Organização e contexto de retomada, sem pressão de tempo nem distrações adicionais.' },
  { id: 'intellectual', label: 'Deficiência intelectual', supports: ['literal-language', 'short-sections', 'glossary'], note: 'Revisar compreensão com o aluno e apoio pedagógico; simplificação isolada não garante compreensão.' },
  { id: 'physical', label: 'Deficiência física / motora', supports: ['short-sections', 'narration'], note: 'Leitura e downloads acessíveis por teclado. Áudio é uma opção, sem gestos obrigatórios.' },
];
