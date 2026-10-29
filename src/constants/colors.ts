// Warm paper and darkroom neutrals instead of pure white and black, which glare on OLED screens.
// Contrast (WCAG): text ≥ 14:1 and secondary text ≥ 4.5:1 on every surface; field borders ≥ 3:1.
export const colors = {
  background: '#FAF8F5', surface: '#F1EEE9', border: '#DDD8D0',
  text: '#1D1B18', secondaryText: '#6B655D', accent: '#1D1B18',
  field: '#FFFFFF', fieldBorder: '#958E83', placeholder: '#8E877D',
  destructive: '#B3261E', success: '#2E7D4F', backdrop: 'rgba(29,27,24,0.4)',
};
export type ThemeColors = typeof colors;
export const darkColors: ThemeColors = {
  background: '#0A0908', surface: '#191816', border: '#2C2A27',
  text: '#F3F0EA', secondaryText: '#A8A197', accent: '#EDE8DF',
  field: '#22201E', fieldBorder: '#77716A', placeholder: '#8A847A',
  destructive: '#FF8A80', success: '#6DD58C', backdrop: 'rgba(0,0,0,0.6)',
};
