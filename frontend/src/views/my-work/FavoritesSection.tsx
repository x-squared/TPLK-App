import type { Favorite } from '../../api';
import { useState, type Dispatch, type SetStateAction } from 'react';
import InlineDeleteActions from '../layout/InlineDeleteActions';
import { useI18n } from '../../i18n/i18n';

interface FavoritesSectionProps {
  favorites: Favorite[];
  typeLabels: Record<string, string>;
  episodeFavoriteNames: Record<number, string>;
  onOpenFavorite: (favorite: Favorite) => void;
  deletingFavoriteId: number | null;
  draggingFavoriteId: number | null;
  dragOverFavoriteId: number | null;
  setDraggingFavoriteId: Dispatch<SetStateAction<number | null>>;
  setDragOverFavoriteId: Dispatch<SetStateAction<number | null>>;
  onDropFavorite: (id: number) => void;
  onDeleteFavorite: (id: number) => void;
}

export default function FavoritesSection({
  favorites,
  typeLabels,
  episodeFavoriteNames,
  onOpenFavorite,
  deletingFavoriteId,
  draggingFavoriteId,
  dragOverFavoriteId,
  setDraggingFavoriteId,
  setDragOverFavoriteId,
  onDropFavorite,
  onDeleteFavorite,
}: FavoritesSectionProps) {
  const { t } = useI18n();
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  return (
    <section className="detail-section ui-panel-section">
      <div className="detail-section-heading">
        <h2>{t('myWork.favorites.title', 'Favorites')}</h2>
      </div>
      <table className="detail-contact-table my-work-favorites-table">
        <thead>
          <tr>
            <th className="open-col"></th>
            <th>{t('myWork.favorites.columns.type', 'Type')}</th>
            <th>{t('myWork.favorites.columns.name', 'Name')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {favorites.length === 0 ? (
            <tr>
              <td colSpan={4} className="detail-empty">{t('myWork.favorites.empty', 'No favorites yet.')}</td>
            </tr>
          ) : (
            favorites.map((favorite) => (
              <tr
                key={favorite.id}
                draggable
                onDragStart={() => setDraggingFavoriteId(favorite.id)}
                onDragOver={(e) => { e.preventDefault(); setDragOverFavoriteId(favorite.id); }}
                onDragLeave={() => setDragOverFavoriteId((prev) => (prev === favorite.id ? null : prev))}
                onDrop={() => onDropFavorite(favorite.id)}
                onDragEnd={() => { setDraggingFavoriteId(null); setDragOverFavoriteId(null); }}
                onDoubleClick={() => onOpenFavorite(favorite)}
                className={draggingFavoriteId === favorite.id ? 'favorite-dragging' : dragOverFavoriteId === favorite.id ? 'favorite-drag-over' : ''}
              >
                <td className="open-col">
                  <button
                    className="open-btn"
                    title={t('myWork.favorites.openTarget', 'Open favorite target')}
                    onClick={() => onOpenFavorite(favorite)}
                  >
                    &#x279C;
                  </button>
                </td>
                <td>{typeLabels[favorite.favorite_type_key] ?? favorite.favorite_type_key}</td>
                <td>
                  {favorite.favorite_type_key === 'EPISODE'
                    ? (episodeFavoriteNames[favorite.id] ?? favorite.name ?? '–')
                    : (favorite.name || '–')}
                </td>
                <td className="my-work-nav-cell">
                  <div className="my-work-actions">
                    <InlineDeleteActions
                      confirming={confirmDeleteId === favorite.id}
                      deleting={deletingFavoriteId === favorite.id}
                      onRequestDelete={() => setConfirmDeleteId(favorite.id)}
                      onConfirmDelete={() => {
                        onDeleteFavorite(favorite.id);
                        setConfirmDeleteId(null);
                      }}
                      onCancelDelete={() => setConfirmDeleteId(null)}
                    />
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
