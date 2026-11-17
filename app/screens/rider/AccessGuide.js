import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../shared/hooks/useApp';
import { Layout } from '../../components';
import { staticStyles, dynamicStyles } from '../../components/rider.styles';

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
      <View style={[s.card, staticStyles.accessGuideView1]}>
        <Text style={s.eyebrow}>How to use</Text>
        <Text style={dynamicStyles.accessGuideText2({ c })}>Five steps to your helmet</Text>
        {steps.map(([ico, t, d], i) => (
          <View key={t} style={staticStyles.accessGuideView3}>
            <View style={staticStyles.accessGuideView4}>
              <View style={dynamicStyles.accessGuideView5({ c })}><Ionicons name={ico} size={20} color={c.onPrimary} /></View>
              {i < steps.length - 1 ? <View style={dynamicStyles.accessGuideView6({ c })} /> : null}
            </View>
            <View style={staticStyles.accessGuideView7}>
              <Text style={dynamicStyles.accessGuideText8({ c })}>STEP {i + 1}</Text>
              <Text style={dynamicStyles.accessGuideText9({ c })}>{t}</Text>
              <Text style={[s.muted, staticStyles.accessGuideText10]}>{d}</Text>
            </View>
          </View>
        ))}
      </View>
    </Layout>
  );
}

export default Guide;
