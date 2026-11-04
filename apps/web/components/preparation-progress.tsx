export function PreparationProgress({ title, detail }: { title: string; detail: string }) {
  return <div className="preparation-progress" role="status">
    <span className="preparation-progress-indicator" aria-hidden="true"/>
    <div><strong>{title}</strong><p className="small">{detail}</p></div>
  </div>;
}
