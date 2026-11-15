import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../shared/hooks/useApp';
import { Layout } from '../../components/common';

function Guide() {
  const { s, c } = useApp();
  const steps = [
    ['card-outline', 'Submit payment and wait for Finance verification', 'Your reservation QR code is available only after payment is verified.'],
    ['walk-outline', 'Go to your reserved storage cabinet', 'Head to the cabinet area at your reserved time.'],
    ['qr-code-outline', 'Present your QR code to Security staff', 'Security staff scan your reservation pass with the Camera Scanner.'],
    ['lock-open-outline', 'Wait for access verification', 'The app verifies your reservation and payment from 30 minutes before your reserved time until the end of that day.'],
    ['shield-checkmark-outline', 'Store or retrieve your helmet safely', 'Security records the storage or retrieval action. This prototype does not directly control a physical cabinet lock.'],
  ];
  return (
    <Layout cur="guide" title="Cabinet Access Guide" subtitle="How to use your reserved storage cabinet.">
      <View style={[s.card, { maxWidth: 720 }]}>
        <Text style={s.eyebrow}>How to use</Text>
        <Text style={{ color: c.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginTop: 4, marginBottom: 22 }}>Five steps to your helmet</Text>
        {steps.map(([ico, t, d], i) => (
          <View key={t} style={{ flexDirection: 'row', gap: 16 }}>
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={ico} size={20} color={c.onPrimary} /></View>
              {i < steps.length - 1 ? <View style={{ width: 2, flex: 1, minHeight: 24, backgroundColor: c.line, marginVertical: 4 }} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: 22, paddingTop: 2 }}>
              <Text style={{ color: c.gold, fontWeight: '800', fontSize: 12, letterSpacing: 1 }}>STEP {i + 1}</Text>
              <Text style={{ color: c.text, fontWeight: '700', fontSize: 16, marginTop: 2 }}>{t}</Text>
              <Text style={[s.muted, { marginTop: 4, lineHeight: 20 }]}>{d}</Text>
            </View>
          </View>
        ))}
      </View>
    </Layout>
  );
}

export default Guide;
