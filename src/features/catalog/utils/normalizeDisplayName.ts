// Only normalize explicit user saves. Never migrate archives or rewrite cloud projections.
const spellings = [
  'Leica', 'Nikon', 'Canon', 'Contax', 'Olympus', 'Pentax', 'Minolta', 'Mamiya',
  'Hasselblad', 'Rolleiflex', 'Rollei', 'Yashica', 'Voigtländer', 'Fujifilm',
  'Kodak', 'Ilford', 'CineStill', 'Lomography', 'Polaroid', 'Agfa', 'Foma', 'Adox',
  'ORWO', 'Ferrania', 'Reflx Lab', 'HP5', 'FP4', 'XP2', 'ISO', 'DX', 'SLR', 'DSLR',
  'AF', 'MF', 'II', 'III', 'IV', 'VI', 'VII', 'VIII', 'IX', '35mm', '50mm', 'B&W',
];
const known = new Map(spellings.map(value => [value.toLowerCase(), value]));

/** Correct known spellings and lowercase words; retain deliberate mixed case and acronyms. */
export function normalizeDisplayName(value: string, canonicalNames: readonly string[] = []): string {
  const clean = value.trim().replace(/\s+/gu, ' ');
  const exact = canonicalNames.find(name => name.toLowerCase() === clean.toLowerCase()) ?? known.get(clean.toLowerCase());
  if (exact) return exact;
  return clean.split(' ').map(word => {
    const canonical = known.get(word.toLowerCase());
    if (canonical) return canonical;
    if (word !== word.toLowerCase()) return word;
    if (/^\d+(?:\.\d+)?mm$/u.test(word)) return word;
    // Camera/stock/process codes such as fm2, ae-1, 400h and c-41.
    if (/\d/u.test(word) && /^[a-z\d]+(?:[-/][a-z\d]+)*$/iu.test(word)) return word.toUpperCase();
    return word.split(/([-/'’])/u).map(part => known.get(part.toLowerCase()) ?? part.replace(/^\p{L}/u, letter => letter.toUpperCase())).join('');
  }).join(' ');
}
