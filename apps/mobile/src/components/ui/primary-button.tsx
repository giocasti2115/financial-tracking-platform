import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native"
import { colors } from "@/theme/colors"

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
}) {
  const isDisabled = disabled || loading
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [styles.button, (pressed || isDisabled) && styles.buttonDisabled]}
    >
      {loading ? <ActivityIndicator color={colors.navy900} /> : <Text style={styles.label}>{label}</Text>}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.gold500,
    borderRadius: 12,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  label: {
    color: colors.navy900,
    fontWeight: "700",
    fontSize: 16,
  },
})