import { SafeAreaView } from "react-native-safe-area-context"
import { ScrollView, StyleSheet, View } from "react-native"
import { colors } from "@/theme/colors"

export function AppScreen({
  children,
  scroll = false,
}: {
  children: React.ReactNode
  scroll?: boolean
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
      ) : (
        <View style={styles.content}>{children}</View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  content: {
    flexGrow: 1,
    padding: 16,
    gap: 16,
  },
})