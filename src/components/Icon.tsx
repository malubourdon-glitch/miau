import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';

export type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/** Ícones são sempre decorativos: o significado vai no texto/label do elemento pai. */
export function Icon({ name, size = 24, color }: { name: IconName; size?: number; color: string }) {
  return (
    <MaterialCommunityIcons
      name={name}
      size={size}
      color={color}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
