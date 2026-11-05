import type { ApiBody, ApiResponse } from "../lib/product-client";

type Page = ApiBody<"editMaterial">["document"][number];
type Fields = Pick<Page, "steps" | "glossary">;
type Supports = ApiResponse<"prepareMaterial">["settings"]["supports"];

export function invalidStructuredContent({ steps, glossary }: Fields) {
  return steps?.some(step => !step.trim()) ||
    glossary?.some(({ term, definition }) => !term.trim() || !definition.trim());
}

export function StructuredMaterialFields({ page, supports, disabled, onChange }: {
  page: Page;
  supports: Supports;
  disabled: boolean;
  onChange: (fields: Fields) => void;
}) {
  const steps = page.steps ?? [];
  const glossary = page.glossary ?? [];
  return <>
    {supports.includes("short-sections") && <fieldset className="form-stack" disabled={disabled}>
      <legend>Passos da página {page.page}</legend>
      {steps.map((step, index) => <div className="form-stack" key={index}>
        <label htmlFor={`step-${page.page}-${index}`}>Passo {index + 1}</label>
        <textarea id={`step-${page.page}-${index}`} rows={2} maxLength={1500} value={step} onChange={event =>
          onChange({ steps: steps.map((value, i) => i === index ? event.target.value : value) })}/>
        <button type="button" className="text-button" onClick={() =>
          onChange({ steps: steps.filter((_, i) => i !== index) })}>Remover passo {index + 1}</button>
      </div>)}
      <button type="button" className="button button-outline" disabled={steps.length >= 12} onClick={() =>
        onChange({ steps: [...steps, ""] })}>Adicionar passo</button>
    </fieldset>}
    {supports.includes("glossary") && <fieldset className="form-stack" disabled={disabled}>
      <legend>Glossário da página {page.page}</legend>
      {glossary.map(({ term, definition }, index) => <div className="form-stack" key={index}>
        <label htmlFor={`term-${page.page}-${index}`}>Termo {index + 1}</label>
        <input id={`term-${page.page}-${index}`} maxLength={120} value={term} onChange={event =>
          onChange({ glossary: glossary.map((entry, i) => i === index ? { ...entry, term: event.target.value } : entry) })}/>
        <label htmlFor={`definition-${page.page}-${index}`}>Definição {index + 1}</label>
        <textarea id={`definition-${page.page}-${index}`} rows={2} maxLength={600} value={definition} onChange={event =>
          onChange({ glossary: glossary.map((entry, i) => i === index ? { ...entry, definition: event.target.value } : entry) })}/>
        <button type="button" className="text-button" onClick={() =>
          onChange({ glossary: glossary.filter((_, i) => i !== index) })}>Remover termo {index + 1}</button>
      </div>)}
      <button type="button" className="button button-outline" disabled={glossary.length >= 12} onClick={() =>
        onChange({ glossary: [...glossary, { term: "", definition: "" }] })}>Adicionar termo</button>
    </fieldset>}
  </>;
}
