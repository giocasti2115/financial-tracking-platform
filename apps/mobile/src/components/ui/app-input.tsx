import { StyleSheet, Text, TextInput, View } from "react-native"
import { colors } from "@/theme/colors"

export function AppInput({
  label,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  placeholder,
}: {
  label: string
  value: string
  onChangeText: (value: string) => void
  secureTextEntry?: boolean
  keyboardType?: "default" | "email-address" | "numeric" | "number-pad"
  autoCapitalize?: "none" | "sentences" | "words" | "characters"
  placeholder?: string
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedText}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    color: colors.navy700,
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.ivory,
    paddingHorizontal: 12,
    color: colors.navy900,
    fontSize: 16,
  },
})