import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { usePlace } from '../lib/place';
import { PrimaryButton } from './ui';

export function LocationSheet() {
  const place = usePlace();
  const [draft, setDraft] = useState('');
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={place.open} transparent animationType="fade" onRequestClose={place.closePicker}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <Pressable
          accessibilityLabel="close location"
          onPress={place.closePicker}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(20,33,61,0.35)' }}
        />
        <View style={{ backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 36 + insets.bottom }}>
          <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '600', letterSpacing: 1.8, textTransform: 'uppercase', color: colors.gray }}>
            where are you
          </Text>
          <Text style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: '600', color: colors.navy, marginTop: 8 }}>
            farms are sorted from this spot.
          </Text>
          <View style={{ marginTop: 22 }}>
            <PrimaryButton
              label={place.busy ? 'finding you…' : 'use my location'}
              disabled={place.busy}
              onPress={place.useDevice}
            />
          </View>
          <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.gray, textAlign: 'center', marginTop: 16 }}>or</Text>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="zip or city"
            placeholderTextColor={colors.gray}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            accessibilityLabel="zip or city"
            onSubmitEditing={() => place.useQuery(draft)}
            style={{ fontFamily: 'Inter', fontSize: 16, color: colors.navy, borderBottomWidth: 1, borderBottomColor: colors.navy, paddingVertical: 10, marginTop: 8 }}
          />
          <View style={{ marginTop: 18 }}>
            <PrimaryButton label="use this place" onPress={() => place.useQuery(draft)} />
          </View>
          {place.error ? (
            <Text style={{ fontFamily: 'Inter', color: colors.red, fontSize: 13, textAlign: 'center', marginTop: 14, lineHeight: 18 }}>
              {place.error}
            </Text>
          ) : null}
          <Pressable onPress={place.closePicker} style={{ marginTop: 18, alignItems: 'center' }}>
            <Text style={{ fontFamily: 'Inter', color: colors.gray, fontSize: 13 }}>close</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
