export interface TypeColorStyle {
  background: string;
  border: string;
  text: string;
}

const TYPE_COLORS: TypeColorStyle[] = [
  { background: '#e8f1ff', border: '#9bbcff', text: '#1f3d7a' },
  { background: '#eaf9ef', border: '#9ed8af', text: '#1e5a33' },
  { background: '#fff3e8', border: '#f0be8f', text: '#7a4318' },
  { background: '#f2edff', border: '#beacec', text: '#4b367f' },
  { background: '#ffeef3', border: '#efb5c8', text: '#7a2947' },
  { background: '#e9f9f9', border: '#9fd8d6', text: '#1f5f5d' },
];

export function getColloqiumTypeColor(typeId: number | null | undefined): TypeColorStyle {
  if (typeId == null) {
    return { background: '#f2f4f8', border: '#cfd5df', text: '#40475a' };
  }
  const index = Math.abs(typeId) % TYPE_COLORS.length;
  return TYPE_COLORS[index];
}
