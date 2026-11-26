export const interactionTypes = [
  "written",
  "short_text",
  "single_choice",
  "multiple_choice",
  "true_false",
  "fill_blank",
  "confidence",
] as const;

export type InteractionType = (typeof interactionTypes)[number];
export type ActivityInteraction = {
  type: InteractionType;
  question?: string;
  options?: string[];
  /** Private to the professor; removed by the API for student responses. */
  answerKey?: string[];
};

export const interactionLabels: Record<InteractionType, string> = {
  written: "Resposta descritiva",
  short_text: "Resposta curta",
  single_choice: "Múltipla escolha · uma opção",
  multiple_choice: "Múltipla escolha · várias opções",
  true_false: "Verdadeiro ou falso",
  fill_blank: "Preencher espaços",
  confidence: "Escala de confiança",
};

export const defaultInteraction: ActivityInteraction = { type: "written" };

export function readAnswerList(value: string | undefined, expectedLength?: number) {
  let answers: string[] = [];
  try {
    const parsed: unknown = JSON.parse(value ?? "[]");
    if (Array.isArray(parsed)) answers = parsed.filter((item): item is string => typeof item === "string");
  } catch {
    answers = [];
  }
  if (typeof expectedLength === "number")
    return Array.from({ length: expectedLength }, (_, index) => answers[index] ?? "");
  return answers;
}

export function displayInteractionAnswer(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every(item => typeof item === "string"))
      return parsed.length ? parsed.join(" · ") : "Sem resposta selecionada";
  } catch {
    // Older activities and written answers are plain text.
  }
  return value;
}
