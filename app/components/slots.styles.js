import { StyleSheet } from 'react-native';

const staticStyles = StyleSheet.create({
  slotAvailabilityText1: { marginBottom: 16 },
  slotAvailabilityView5: { flex: 1 }
});

const dynamicStyles = {
  slotAvailabilityView2: ({ c }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderColor: c.line }),
  slotAvailabilityView3: ({ c }) => ({ width: 44, height: 44, borderRadius: 12, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }),
  slotAvailabilityText4: ({ c }) => ({ color: c.text, fontSize: 16, fontWeight: '800' }),
  slotAvailabilityText6: ({ c }) => ({ color: c.text, fontWeight: '700' })
};

export { staticStyles, dynamicStyles };
