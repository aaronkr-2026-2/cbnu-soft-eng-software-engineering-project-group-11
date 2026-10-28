import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../../../constants/theme';
import { useTranslation } from '../../../i18n/useTranslation';
import { colorChannelAt, replaceColorChannel } from '../utils/contactSheetColor';

/** Draft changes stay local during a gesture; persist once when the finger lifts. */
export function ContactSheetColorSliders({ color, disabled, onCommit }: {
  color: string; disabled: boolean; onCommit: (color: string) => void;
}) {
  const [draft, setDraft] = useState(color);
  const latest = useRef(color);
  const widths = useRef([1, 1, 1]);
  const theme = useTheme();
  const { t } = useTranslation();
  function update(channel: number, x: number) {
    const next = replaceColorChannel(latest.current, channel, colorChannelAt(x, widths.current[channel]));
    latest.current = next;
    setDraft(next);
  }
  const labels = [t('csRed'), t('csGreen'), t('csBlue')];
  return <View style={{ gap: 4 }}>
    <View accessibilityLabel={draft} style={{ height: 24, borderRadius: 6, backgroundColor: draft, borderWidth: 1, borderColor: theme.border }} />
    {labels.map((label, channel) => {
      const value = parseInt(draft.slice(1 + channel * 2, 3 + channel * 2), 16);
      return <View key={channel} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ color: theme.text, width: 82, fontSize: 12 }}>{label} {value}</Text>
        <View accessibilityRole="adjustable" accessibilityLabel={label}
          accessibilityState={{ disabled }} accessibilityValue={{ min: 0, max: 255, now: value }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={event => {
            if (disabled) return;
            const next = replaceColorChannel(latest.current, channel, value + (event.nativeEvent.actionName === 'increment' ? 5 : -5));
            latest.current = next; setDraft(next); onCommit(next);
          }}
          onLayout={event => { widths.current[channel] = Math.max(1, event.nativeEvent.layout.width); }}
          onStartShouldSetResponder={() => !disabled}
          onMoveShouldSetResponder={() => !disabled}
          onResponderTerminationRequest={() => false}
          onResponderGrant={event => update(channel, event.nativeEvent.locationX)}
          onResponderMove={event => update(channel, event.nativeEvent.locationX)}
          onResponderRelease={() => onCommit(latest.current)}
          onResponderTerminate={() => onCommit(latest.current)}
          style={{ flex: 1, height: 44, justifyContent: 'center', opacity: disabled ? 0.4 : 1 }}>
          <View pointerEvents="none" style={{ height: 12, flexDirection: 'row', borderRadius: 6, overflow: 'hidden' }}>
            {Array.from({ length: 32 }, (_, step) => <View key={step} style={{
              flex: 1, backgroundColor: replaceColorChannel(draft, channel, step * 255 / 31),
            }} />)}
          </View>
          <View pointerEvents="none" style={{ position: 'absolute', left: `${value / 255 * 100}%`, marginLeft: -10,
            width: 20, height: 20, borderRadius: 10, backgroundColor: draft, borderWidth: 3, borderColor: theme.text }} />
        </View>
      </View>;
    })}
  </View>;
}
