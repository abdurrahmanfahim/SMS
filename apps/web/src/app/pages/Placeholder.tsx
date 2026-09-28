/** Temporary page body for a route group until real content is added. */
export function Placeholder({ name }: { name: string }) {
  return <p data-testid={`page-${name}`}>{name}</p>;
}
