const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['.expo/**', 'dist/**', 'ios/**', 'ios-backup/**', 'android/**', 'assets/**', 'resources/**'] },
  { files: ['**/__tests__/*.cjs'], languageOptions: { globals: { __dirname: 'readonly', Buffer: 'readonly', setImmediate: 'readonly' } } },
  {
    files: ['src/features/photos/components/PhotoViewerModal.tsx', 'src/features/photos/components/ReorderablePhotoGrid.tsx', 'src/features/photos/hooks/usePhotoSelectionGesture.ts'],
    // Reanimated SharedValue.value mutations are the supported worklet API, not React state mutation.
    rules: { 'react-hooks/immutability': 'off' },
  },
  {
    files: ['src/components/ui/DatePicker.tsx', 'src/components/ui/MonthYearPicker.tsx', 'src/features/photos/hooks/usePhotoSelection.ts', 'src/features/contact-sheet/components/ContactSheetCanvas.tsx'],
    // Existing prop-driven modal resets/selection reconciliation; no React Compiler is enabled.
    rules: { 'react-hooks/set-state-in-effect': 'off' },
  },
  {
    files: ['src/components/ui/Toast.tsx'],
    // RN Animated.Value is an imperative native animation object held in a stable ref.
    rules: { 'react-hooks/refs': 'off', 'react-hooks/set-state-in-effect': 'off' },
  },
]);
