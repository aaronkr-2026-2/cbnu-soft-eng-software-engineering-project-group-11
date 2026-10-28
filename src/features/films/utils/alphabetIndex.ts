export const indexLetters = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '#'] as const;

/** Index letter for a brand: accents are folded (É → E); digits and symbols go under #. */
export function indexLetter(title: string) {
  const first = title.trim().normalize('NFD').replace(/[̀-ͯ]/g, '').charAt(0).toUpperCase();
  return /^[A-Z]$/.test(first) ? first : '#';
}

/** First section for each letter that has one; titles must already be in display order. */
export function letterSections(titles: string[]) {
  const sections = new Map<string, number>();
  titles.forEach((title, index) => {
    const letter = indexLetter(title);
    if (!sections.has(letter)) sections.set(letter, index);
  });
  return sections;
}

/** A letter without brands jumps to the next one that has some, else the closest before it. */
export function sectionForLetter(letter: string, sections: ReadonlyMap<string, number>) {
  const position = indexLetters.indexOf(letter as typeof indexLetters[number]);
  if (position < 0) return undefined;
  for (let i = position; i < indexLetters.length; i++) if (sections.has(indexLetters[i])) return sections.get(indexLetters[i]);
  for (let i = position - 1; i >= 0; i--) if (sections.has(indexLetters[i])) return sections.get(indexLetters[i]);
  return undefined;
}

/** Letter under a finger at `offset` points from the top of a strip `height` points tall. */
export function letterAt(offset: number, height: number) {
  const slot = Math.floor(offset / Math.max(1, height) * indexLetters.length);
  return indexLetters[Math.max(0, Math.min(indexLetters.length - 1, slot))];
}
