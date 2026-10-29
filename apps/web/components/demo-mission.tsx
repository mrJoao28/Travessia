'use client';

import { useState } from 'react';

const stages = [
  { title: 'Compreender o problema', instruction: 'Liste quem utiliza uma biblioteca e quais informações são necessárias para emprestar um livro.', example: 'Por exemplo: leitor, livro disponível e data de devolução.' },
  { title: 'Planejar a solução', instruction: 'Organize as funcionalidades em uma sequência: cadastrar, consultar e registrar um empréstimo.', example: 'Comece desenhando o caminho de um único empréstimo antes de pensar em outras funções.' },
  { title: 'Desenvolver', instruction: 'Implemente uma funcionalidade por vez e verifique se ela funciona antes de avançar.', example: 'Você pode começar pelo cadastro de um livro.' },
  { title: 'Testar e ajustar', instruction: 'Escolha entradas válidas e inválidas e descreva o resultado esperado para cada uma.', example: 'O que deve acontecer quando o código de um livro não existe?' },
  { title: 'Apresentar', instruction: 'Explique uma escolha de implementação e mostre como você verificou o comportamento do programa.', example: 'A avaliação de código e o envio de arquivos serão implementados na próxima fase.' }
];

export function DemoMission() {
  const [index, setIndex] = useState(1);
  const stage = stages[index];
  return <section className="paper lesson-reader" aria-labelledby="stage-title">
    <p className="eyebrow">Uma biblioteca para todos</p>
    <p role="status">Etapa {index + 1} de {stages.length}</p>
    <h2 id="stage-title">{stage.title}</h2><p>{stage.instruction}</p>
    <details className="example"><summary>Ver um exemplo</summary><p>{stage.example}</p></details>
    <div className="actions"><button type="button" className="button button-outline" disabled={index === 0} onClick={() => setIndex(i => i - 1)}>Etapa anterior</button><button type="button" className="button" disabled={index === stages.length - 1} onClick={() => setIndex(i => i + 1)}>Próxima etapa</button></div>
    <p className="small">Navegação demonstrativa. Avançar não marca uma atividade como concluída nem salva progresso.</p>
  </section>;
}
