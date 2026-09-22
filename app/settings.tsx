import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors } from '../src/constants/theme';

export default function Settings() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Pressable accessibilityRole="button" onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.description}>
          Archive settings will be available in a later milestone.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 24, paddingTop: 16 },
  back: { color: colors.text, fontSize: 17, marginBottom: 28 },
  title: { color: colors.text, fontSize: 28, fontWeight: '700' },
  description: { color: colors.secondaryText, fontSize: 16, lineHeight: 24, marginTop: 14 },
});
