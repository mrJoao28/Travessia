import { Icon } from "./icons";
export type StartingSpace = "aluno" | "professor";

export function StartingSpaceChoice({ value, onChange, disabled = false }: {
  value: StartingSpace; onChange: (value: StartingSpace) => void; disabled?: boolean;
}) {
  return <fieldset className="starting-space" disabled={disabled}>
    <legend>Escolha como você quer começar.</legend>
    <div className="starting-space-options">
      {(["aluno", "professor"] as const).map(space => <label key={space} className="starting-space-option">
        <input type="radio" name="starting-space" value={space} checked={value === space} onChange={() => onChange(space)} />
        <Icon name={space === "aluno" ? "book" : "users"} />
        <span>Sou {space}</span>
      </label>)}
    </div>
  </fieldset>;
}
