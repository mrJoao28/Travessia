"use client";

import { useId } from "react";
import {
  type ActivityInteraction,
  interactionLabels,
  interactionTypes,
} from "../lib/activity-interactions";

export function ActivityInteractionEditor({
  id,
  value = { type: "written" },
  onChange,
}: {
  id: string;
  value?: ActivityInteraction;
  onChange: (value: ActivityInteraction) => void;
}) {
  const instructionsId = useId();
  const type = value.type;
  const options = type === "true_false" ? ["true", "false"] : (value.options ?? []);
  const answerKey = value.answerKey ?? [];
  const usesOptions = type === "single_choice" || type === "multiple_choice";

  function update(next: Partial<ActivityInteraction>) {
    onChange({ ...value, ...next });
  }

  function changeType(nextType: ActivityInteraction["type"]) {
    const nextOptions = nextType === "true_false"
      ? ["true", "false"]
      : nextType === "single_choice" || nextType === "multiple_choice"
        ? (value.options?.length ? value.options : ["", ""])
        : undefined;
    onChange({
      type: nextType,
      ...(value.question ? { question: value.question } : {}),
      ...(nextOptions ? { options: nextOptions } : {}),
      answerKey: [],
    });
  }

  function updateOption(index: number, nextOption: string) {
    const nextOptions = [...options];
    const previousOption = nextOptions[index];
    nextOptions[index] = nextOption;
    update({
      options: nextOptions,
      answerKey: answerKey.map(answer => answer === previousOption ? nextOption : answer),
    });
  }

  function addOption() {
    if (options.length < 8) update({ options: [...options, ""] });
  }

  function removeOption(index: number) {
    if (options.length <= 2) return;
    const removed = options[index];
    update({
      options: options.filter((_, optionIndex) => optionIndex !== index),
      answerKey: answerKey.filter(answer => answer !== removed),
    });
  }

  return (
    <section className="interaction-authoring form-stack" aria-labelledby={`${id}-title`}>
      <div>
        <h4 id={`${id}-title`}>Como o aluno vai responder?</h4>
        <p className="small">Escolha um formato para esta etapa. A avaliação continua com o professor.</p>
      </div>
      <label htmlFor={`${id}-type`}>
        Tipo de resposta
        <select id={`${id}-type`} required value={type} onChange={event => changeType(event.target.value as ActivityInteraction["type"])}>
          {interactionTypes.map(item => <option value={item} key={item}>{interactionLabels[item]}</option>)}
        </select>
      </label>
      {type !== "written" && (
        <label htmlFor={`${id}-question`}>
          {type === "fill_blank" ? "Frase ou texto com espaços" : "Pergunta para o aluno"}
          {type === "fill_blank" ? (
            <textarea id={`${id}-question`} required maxLength={1000} value={value.question ?? ""}
              onChange={event => update({ question: event.target.value })} aria-describedby={instructionsId} />
          ) : (
            <input id={`${id}-question`} required maxLength={1000} value={value.question ?? ""}
              onChange={event => update({ question: event.target.value })} />
          )}
        </label>
      )}
      {type === "written" && (
        <label htmlFor={`${id}-question`}>
          Orientação para a resposta (opcional)
          <input id={`${id}-question`} maxLength={1000} value={value.question ?? ""}
            onChange={event => update({ question: event.target.value })} />
        </label>
      )}
      {type === "short_text" && <p className="small" id={instructionsId}>Resposta de texto curto, até 1.000 caracteres.</p>}
      {usesOptions && (
        <>
          <fieldset className="interaction-options-editor" aria-describedby={instructionsId}>
            <legend>Opções de resposta</legend>
            <p className="small" id={instructionsId}>Escreva uma opção em cada campo. Adicione de 2 a 8 opções.</p>
            <ol className="interaction-option-list">
              {options.map((option, index) => (
                <li className="interaction-option-row" key={index}>
                  <label htmlFor={`${id}-option-${index}`}>Opção {index + 1}</label>
                  <input id={`${id}-option-${index}`} type="text" maxLength={200} required value={option}
                    placeholder={`Escreva a opção ${index + 1}`}
                    onChange={event => updateOption(index, event.target.value)} />
                  <button type="button" className="button button-outline interaction-option-remove"
                    aria-label={`Remover opção ${index + 1}`} disabled={options.length <= 2}
                    onClick={() => removeOption(index)}>Remover</button>
                </li>
              ))}
            </ol>
            <div className="interaction-option-footer">
              <button type="button" className="button button-outline" disabled={options.length >= 8}
                onClick={addOption}>+ Adicionar opção</button>
              <span className="small" aria-live="polite">{options.length} de 8 opções</span>
            </div>
          </fieldset>
          <p className="small">A resposta esperada é opcional e fica privada para apoiar a revisão do professor.</p>
          {options.length > 0 && <fieldset className="interaction-key-list">
            <legend>{type === "single_choice" ? "Resposta esperada · opcional" : "Respostas esperadas · opcionais"}</legend>
            <p className="small">Usadas como referência privada na revisão. Não são mostradas nem corrigidas automaticamente.</p>
            {options.map((option, index) => (
              <label className="check" key={`${index}-${option}`}>
                <input type={type === "single_choice" ? "radio" : "checkbox"} name={`${id}-answer-key`}
                  value={option} checked={answerKey.includes(option)} disabled={!option}
                  onChange={event => update({ answerKey: type === "single_choice"
                    ? event.target.checked ? [option] : []
                    : event.target.checked ? [...answerKey, option] : answerKey.filter(answer => answer !== option) })} />
                {option || `Opção ${index + 1} (preencha acima)`}
              </label>
            ))}
          </fieldset>}
        </>
      )}
      {type === "true_false" && (
        <fieldset className="interaction-key-list">
          <legend>Resposta esperada · opcional</legend>
          <p className="small">Fica visível apenas para quem revisa a atividade.</p>
          {options.map(option => <label className="check" key={option}>
            <input type="radio" name={`${id}-true-false-key`} checked={answerKey[0] === option}
              onChange={() => update({ answerKey: [option] })} />
            {option === "true" ? "Verdadeiro" : "Falso"}
          </label>)}
        </fieldset>
      )}
      {type === "fill_blank" && (
        <label htmlFor={`${id}-answer-key`}>
          Respostas esperadas · uma por espaço, na ordem (privadas)
          <textarea id={`${id}-answer-key`} required maxLength={1000} value={answerKey.join("\n")}
            onChange={event => update({ answerKey: event.target.value.split("\n").map(answer => answer.trim()).filter(Boolean) })}
            aria-describedby={instructionsId} />
          <span id={instructionsId} className="small">Use [[1]], [[2]] e assim por diante na frase, até cinco espaços. A resposta não recebe nota automática.</span>
        </label>
      )}
      {type === "confidence" && <p className="small" id={instructionsId}>A pessoa escolhe de 1 (preciso de orientação) a 5 (consigo explicar para alguém). A resposta ajuda o professor a oferecer apoio.</p>}
      {type === "written" && <p className="small">O aluno responde com texto. Também pode usar os formatos adicionais liberados pelo professor.</p>}
    </section>
  );
}
