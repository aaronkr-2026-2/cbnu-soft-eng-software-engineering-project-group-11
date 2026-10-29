import { useState } from 'react';
import { TextInput } from 'react-native';
import { CatalogItemModal } from '../../catalog/components/CatalogItemModal';
import { useTheme, useThemedStyles } from '../../../constants/theme';
import { useTranslation } from '../../../i18n/useTranslation';
import { createRollFormStyles } from '../styles/roll-form.styles';
export function RollTextEditor({ title, value, onSave, onClose, numeric = false, multiline = false }: {
  title: string; value: string; onSave: (value: string) => void | boolean; onClose: () => void; numeric?: boolean; multiline?: boolean;
}) {
  const [text, setText] = useState(value);
  const [error, setError] = useState(false);
  const { t } = useTranslation();
  const colors = useTheme();
  const styles = useThemedStyles(createRollFormStyles);
  return <CatalogItemModal visible title={title} actionLabel={t('done')} onClose={onClose} error={error ? t('invalidRoll') : null} onSubmit={() => {
    // A blank number clears an optional count.
    if (numeric && text.trim() && (!/^\d+$/.test(text.trim()) || !Number.isSafeInteger(Number(text)) || Number(text) <= 0)) { setError(true); return; }
    if (onSave(text.trim()) !== false) onClose();
  }}><TextInput autoFocus accessibilityLabel={title} placeholder={title} placeholderTextColor={colors.secondaryText} value={text} onChangeText={setText} keyboardType={numeric ? 'number-pad' : 'default'} multiline={multiline} style={styles.input} /></CatalogItemModal>;
}
