export type Film = {
  id: string;
  brand: string;
  name: string;
  iso: number;
  format: '35mm' | '120' | '110' | 'other';
  type: 'color' | 'black-and-white' | 'slide' | 'cinema';
  formats?: Film['format'][];
  process?: string;
  status?: 'current' | 'discontinued' | 'specialty';
  imageKey?: string;
  shortDescription?: Partial<Record<'en' | 'vi' | 'ko', string>>;
  aliases?: string[];
  legacyIds?: string[];
  source?: 'builtin' | 'custom';
  imageUrl?: string;
  imageUri?: string;
  imageDocumentPath?: string;
  isCustom: boolean;
};

export type FilmOverride = Pick<Film, 'brand' | 'name' | 'iso' | 'type' | 'format'> &
  Pick<Film, 'formats' | 'process' | 'imageUri' | 'imageDocumentPath'> & { imageKey?: string | null };

export type Camera = {
  id: string;
  brand: string;
  model: string;
  format?: '35mm' | '120' | '110';
  imageUri?: string;
  imageUrl?: string;
  isCustom: boolean;
};
