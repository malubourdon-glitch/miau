import React, { useState } from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './AppText';

interface Props extends TextInputProps {
  label: string;
  helper?: string;
  error?: string;
}

/** Campo com rótulo visível (não só placeholder), ajuda e erro anunciáveis. */
export function LabeledInput({ label, helper, error, style, ...rest }: Props) {
  const { colors, font, radius, touchTarget } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <AppText variant="body" weight="700" nativeID={`lbl-${label}`}>
        {label}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error ?? helper}
        aria-labelledby={`lbl-${label}`}
        placeholderTextColor={colors.metal}
        selectionColor={colors.accent}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        style={[
          styles.input,
          {
            minHeight: touchTarget.comfortable,
            fontSize: font('bodyLarge'),
            color: colors.text,
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            borderColor: error ? colors.occupied : focused ? colors.focus : colors.border,
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="caption" tone="muted">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  input: { borderWidth: 2, paddingHorizontal: 16 },
});
