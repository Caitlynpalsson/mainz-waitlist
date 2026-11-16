import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { SEARCH_EMPTY } from '../../../api/src/search';
import { colors } from '../theme';
import { IconSearch } from './icons';

export { SEARCH_EMPTY };

export function ProductSearchIcon({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="search products" onPress={onPress} style={hit}>
      <IconSearch size={16} color={colors.navy} />
    </Pressable>
  );
}

export function ProductSearchField({
  farmName,
  value,
  onChange,
  onClose,
}: {
  farmName: string;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  const placeholder = `search ${farmName.trim().toLowerCase()} products`;
  const [focused, setFocused] = useState(false);
  return (
    <View style={[field, focused ? fieldFocus : null]}>
      <IconSearch size={15} color={colors.gray} />
      <TextInput
        autoFocus
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.gray}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyPress={(event) => {
          if (event.nativeEvent.key === 'Escape') onClose();
        }}
        style={[input, bareInput]}
      />
      {value ? (
        <Pressable accessibilityRole="button" accessibilityLabel="clear search" onPress={() => onChange('')} style={clearHit}>
          <Text style={clearMark}>x</Text>
        </Pressable>
      ) : null}
      <Pressable accessibilityRole="button" accessibilityLabel="cancel search" onPress={onClose} style={cancelHit}>
        <Text style={cancelText}>cancel</Text>
      </Pressable>
    </View>
  );
}

export function FarmSearchField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[field, focused ? fieldFocus : null]}>
      <IconSearch size={15} color={colors.gray} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="search farms"
        placeholderTextColor={colors.gray}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="search farms"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[input, bareInput]}
      />
      {value ? (
        <Pressable accessibilityRole="button" accessibilityLabel="clear search" onPress={() => onChange('')} style={clearHit}>
          <Text style={clearMark}>x</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const hit = { width: 44, height: 44, alignItems: 'center' as const, justifyContent: 'center' as const };
const clearHit = { width: 44, height: 44, flexGrow: 0, flexShrink: 0, alignItems: 'center' as const, justifyContent: 'center' as const };
const cancelHit = { minWidth: 44, height: 44, paddingHorizontal: 10, flexGrow: 0, flexShrink: 0, alignItems: 'center' as const, justifyContent: 'center' as const };
const field = { width: '100%' as const, minWidth: 0, minHeight: 44, borderRadius: 999, backgroundColor: colors.cream, flexDirection: 'row' as const, alignItems: 'center' as const, paddingLeft: 14, paddingRight: 4, borderWidth: 0 };
const fieldFocus = { boxShadow: '0 0 0 2px #9FBBE0' };
const input = {
  flexGrow: 1,
  flexShrink: 1,
  flexBasis: 0 as const,
  minWidth: 0,
  fontFamily: 'Inter' as const,
  fontSize: 14,
  color: colors.navy,
  paddingVertical: 0,
  marginLeft: 8,
  borderWidth: 0,
};
const bareInput = { outlineStyle: 'none', outlineWidth: 0, borderWidth: 0 } as object;
const clearMark = { fontFamily: 'Inter' as const, fontSize: 16, color: colors.gray };
const cancelText = { fontFamily: 'Inter' as const, fontSize: 13, color: colors.gray };
