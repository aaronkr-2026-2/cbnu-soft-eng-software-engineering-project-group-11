export type Film = {
  id: string;
  brand: string;
  name: string;
  iso: number;
  format: '35mm' | '120' | '110' | 'other';
  type: 'color' | 'black-and-white' | 'slide';
  imageUrl?: string;
  imageUri?: string;
  isCustom: boolean;
};

export type Camera = {
  id: string;
  brand: string;
  model: string;
  format?: '35mm' | '120' | '110';
  imageUri?: string;
  imageUrl?: string;
  isCustom: boolean;
};
