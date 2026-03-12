interface FavoriteButtonProps {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  title?: string;
}

export default function FavoriteButton({
  active,
  disabled = false,
  onClick,
  title,
}: FavoriteButtonProps) {
  return (
    <button
      className={`ui-favorite-btn ${active ? 'active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={title ?? (active ? 'Remove from favorites' : 'Add to favorites')}
      aria-label={title ?? (active ? 'Remove from favorites' : 'Add to favorites')}
    >
      {active ? '★' : '☆'}
    </button>
  );
}
