import type { FilmOverride } from '../../../types/models';
import { useFilmStore } from '../store/filmStore';
import { FilmForm } from './FilmForm';
type Props = { onAdded: (filmId: string) => void; onClose: () => void; visible: boolean };
export function CustomFilmModal({ onAdded, onClose, visible }: Props) {
  const addCustomFilm = useFilmStore(state => state.addCustomFilm);
  function add(input: FilmOverride) {
    const { imageKey, ...fields } = input;
    const film = addCustomFilm({ ...fields, imageKey: imageKey ?? undefined });
    onAdded(film.id);
  }
  return <FilmForm mode="create" visible={visible} onClose={onClose} onSubmit={add} />;
}
