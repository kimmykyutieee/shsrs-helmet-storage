import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../shared/hooks/useApp';
import { Layout } from '../../components';
import { staticStyles, dynamicStyles } from '../../components/rider.styles';

function Guide() {
  const { s, c } = useApp();
  const steps = [
    ['calendar-outline', 'Reserve a locker', 'Choose an available locker, date, and time for your visit.'],
    ['card-outline', 'Submit your payment', 'Upload your receipt and wait for Finance to verify it.'],
    ['qr-code-outline', 'Open your reservation QR', 'Your QR pass is available after payment verification, at your reservation start time.'],
    ['walk-outline', 'Show the QR to Security', 'Go to the locker area and present your pass to Security staff to scan.'],
    ['shield-checkmark-outline', 'Store or retrieve your helmet', 'Security records the activity and confirms when it is complete.'],
  ];
  return (
    <Layout cur="guide" title="Locker Access Guide" subtitle="How to use your reserved locker.">
      <View style={[s.card, staticStyles.accessGuideView1]}>
        <Text style={dynamicStyles.accessGuideText2({ c })}>HOW TO USE?</Text>
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
