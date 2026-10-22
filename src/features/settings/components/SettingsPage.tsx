import { useCallback, useRef, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, usePathname, useFocusEffect } from 'expo-router';
import { BackButton } from '../../../components/ui/BackButton';
import { darkColors } from '../../../constants/colors';
import { createSettingsStyles } from '../styles/settings.styles';

export const settingsStyles = createSettingsStyles(darkColors);
export function SettingsPage({ title, children }: { title: string; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const scroll = useRef<ScrollView>(null);
  useFocusEffect(useCallback(() => {
    const frame = requestAnimationFrame(() => scroll.current?.scrollTo({ y: 0, animated: false }));
    return () => cancelAnimationFrame(frame);
  }, []));
  return <SafeAreaView style={settingsStyles.screen}>
    <StatusBar style="light" />
    <ScrollView ref={scroll} contentOffset={topOffset} contentInsetAdjustmentBehavior="never" automaticallyAdjustContentInsets={false}>
      <View style={settingsStyles.content}>
      <View style={settingsStyles.header}>
        <BackButton tone="dark" onPress={() => router.canGoBack() ? router.back() : router.replace(pathname === '/settings' ? '/' : '/settings')} />
        <Text accessibilityRole="header" style={settingsStyles.title}>{title}</Text>
        <View style={settingsStyles.spacer} />
      </View>
      {children}
      </View>
    </ScrollView>
  </SafeAreaView>;
}
export function SettingsGroup({ title, children }: { title?: string; children: ReactNode }) {
  return <View style={settingsStyles.group}>
    {title && <Text accessibilityRole="header" style={settingsStyles.heading}>{title.toLocaleUpperCase()}</Text>}
    <View style={settingsStyles.card}>{children}</View>
  </View>;
}
export function SettingsRow({ label, value, description, icon, iconColor, trailing, onPress, disabled = false }: {
  label: string; value?: string; description?: string; icon?: string; iconColor?: string; trailing?: ReactNode; onPress?: () => void; disabled?: boolean;
}) {
  const content = <>
    {icon && <Text accessible={false} style={[settingsStyles.rowIcon, iconColor ? { color: iconColor } : undefined]}>{icon}</Text>}
    {description ? <View style={settingsStyles.rowCopy}>
      <Text style={settingsStyles.infoTitle}>{label}</Text>
      <Text style={settingsStyles.rowDescription}>{description}</Text>
    </View> : <Text style={settingsStyles.label}>{label}</Text>}
    {value !== undefined && <Text style={settingsStyles.value}>{value}</Text>}
    {trailing ?? (onPress && <Text style={settingsStyles.value}>›</Text>)}
  </>;
  return onPress ? <Pressable accessibilityRole="button"
    accessibilityLabel={label} accessibilityValue={value ? { text: value } : undefined}
    accessibilityState={{ disabled }}
    disabled={disabled} onPress={onPress} style={({ pressed }) => [settingsStyles.row, (pressed || disabled) && settingsStyles.dimmed]}>{content}</Pressable>
    : <View accessible={!trailing} accessibilityLabel={[label, value, description].filter(Boolean).join(". ")} style={settingsStyles.row}>{content}</View>;
}
export function SettingsNote({ children }: { children: ReactNode }) {
  return <Text style={[settingsStyles.note, settingsStyles.noteInset, { marginBottom: 16 }]}>{children}</Text>;
}

const topOffset = { x: 0, y: 0 };
