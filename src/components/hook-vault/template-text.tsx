/** Destaca os {placeholders} de um template de hook com a cor de accent. */
export function TemplateText({ template }: { template: string }) {
  const parts = template.split(/(\{[^}]+\})/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("{") ? (
          <span key={i} className="bg-accent text-accent-foreground rounded px-1 py-0.5 font-medium">
            {p.slice(1, -1)}
          </span>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}
