import React from 'react';
import { View, Text, StatusBar, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../shared/hooks/useApp';
import { NAVY, GOLD } from '../../shared/constants/theme';
import { Shield, Gradient, Btn } from '../../components/common';

function Home() {
  const { db, nav, setInfo, width } = useApp();
  const wide = width >= 900;
  const features = [
    ['qr-code-outline', 'Verified QR access', 'Finance verification is required before a reservation QR code is released.'],
    ['grid-outline', '12 smart slots', 'Pick a slot, date and time. Live availability prevents double bookings.'],
    ['notifications-outline', 'Smart reminders', 'See your next reservation and same-day reminders on your dashboard.'],
    ['shield-checkmark-outline', 'Admin controls', 'Maintenance mode, full access logs and CSV exports for administrators.'],
  ];
  const steps = [['person-add-outline', 'Create an account'], ['calendar-outline', 'Reserve and submit payment'], ['qr-code-outline', 'Wait for verification, then get your QR'], ['lock-open-outline', 'Scan and store your helmet']];
  const pad2 = wide ? 56 : 22;
  return (
    <View style={{ flex: 1, backgroundColor: NAVY }}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View style={{ overflow: 'hidden' }}>
            <Gradient id="hero" from="#08122b" to="#17397f" />
            <View style={{ position: 'absolute', right: -120, top: -120, width: 420, height: 420, borderRadius: 210, backgroundColor: 'rgba(212,160,23,0.10)' }} />
            <View style={{ position: 'absolute', left: -140, bottom: -160, width: 380, height: 380, borderRadius: 190, backgroundColor: 'rgba(255,255,255,0.04)' }} />
            <View style={{ width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: pad2, paddingTop: 22, paddingBottom: wide ? 90 : 56 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: wide ? 70 : 40 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Shield size={32} /><Text style={{ color: '#fff', fontWeight: '800', fontSize: 17, letterSpacing: 0.6 }}>SHSRS</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {db.me ? <Btn small variant="ghostDark" label="Dashboard" onPress={() => nav('dashboard')} /> : (
                    <>
                      <Btn small variant="ghostDark" label="Log in" onPress={() => nav('login')} />
                      <Btn small variant="gold" label="Register" onPress={() => nav('register')} />
                    </>
                  )}
                </View>
              </View>
              <View style={{ flexDirection: wide ? 'row' : 'column', alignItems: 'center', gap: 40 }}>
                <View style={{ flex: wide ? 1.15 : undefined }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: 'rgba(212,160,23,0.14)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, marginBottom: 20 }}>
                    <Ionicons name="shield-checkmark" size={14} color={GOLD} />
                    <Text style={{ color: '#f1d27a', fontSize: 12, fontWeight: '700', letterSpacing: 0.6 }}>SMART HELMET STORAGE</Text>
                  </View>
                  <Text style={{ color: '#fff', fontSize: wide ? 54 : 36, fontWeight: '800', letterSpacing: wide ? -1.8 : -1, lineHeight: wide ? 60 : 42 }}>
                    Secure helmet storage, <Text style={{ color: GOLD }}>reserved in seconds.</Text>
                  </Text>
                  <Text style={{ color: '#aebbd8', fontSize: wide ? 18 : 16, lineHeight: wide ? 28 : 24, marginTop: 18, maxWidth: 540 }}>
                    Manage and reserve safety helmets efficiently. Book a cabinet slot, submit payment for review, and access your QR code after verification.
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 30 }}>
                    <Btn variant="gold" icon="arrow-forward" label="Reserve now" onPress={() => nav(db.me ? 'reservations' : 'login')} />
                    <Btn variant="ghostDark" icon="book-outline" label="System manual" onPress={() => setInfo('manual')} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: wide ? 40 : 24, marginTop: 38 }}>
                    {[['12', 'Secure slots'], ['QR', 'One-scan access'], ['Live', 'Availability']].map(([a, b]) => (
                      <View key={b}><Text style={{ color: '#fff', fontSize: 26, fontWeight: '800' }}>{a}</Text><Text style={{ color: '#8fa3cc', fontSize: 13 }}>{b}</Text></View>
                    ))}
                  </View>
                </View>
                {wide ? (
                  <View style={{ flex: 0.85, alignItems: 'center', justifyContent: 'center', height: 380 }}>
                    <View style={{ position: 'absolute', width: 340, height: 340, borderRadius: 170, backgroundColor: 'rgba(212,160,23,0.08)', borderWidth: 1, borderColor: 'rgba(212,160,23,0.25)' }} />
                    <View style={{ position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }} />
                    <Shield size={170} />
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          <View style={{ backgroundColor: '#f4f6fb' }}>
            <View style={{ width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: pad2, paddingVertical: wide ? 70 : 44 }}>
              <Text style={{ color: '#B7791F', fontSize: 12, fontWeight: '800', letterSpacing: 1.6, textAlign: 'center' }}>WHY SHSRS</Text>
              <Text style={{ color: '#0F172A', fontSize: wide ? 34 : 26, fontWeight: '800', letterSpacing: -0.8, textAlign: 'center', marginTop: 8, marginBottom: 34 }}>Everything you need to store a helmet safely</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                {features.map(([ico, t, d]) => (
                  <View key={t} style={{ flexGrow: 1, flexBasis: wide ? '22%' : '100%', backgroundColor: '#fff', borderRadius: 18, padding: 22, borderWidth: 1, borderColor: '#e3e8f2' }}>
                    <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: '#FBF2D9', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}><Ionicons name={ico} size={22} color="#B7791F" /></View>
                    <Text style={{ color: '#0F172A', fontSize: 16.5, fontWeight: '700', marginBottom: 6 }}>{t}</Text>
                    <Text style={{ color: '#64748B', lineHeight: 21 }}>{d}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={{ backgroundColor: NAVY }}>
            <View style={{ width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: pad2, paddingVertical: wide ? 64 : 44 }}>
              <Text style={{ color: GOLD, fontSize: 12, fontWeight: '800', letterSpacing: 1.6, textAlign: 'center' }}>HOW IT WORKS</Text>
              <Text style={{ color: '#fff', fontSize: wide ? 32 : 25, fontWeight: '800', letterSpacing: -0.8, textAlign: 'center', marginTop: 8, marginBottom: 32 }}>Four simple steps</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                {steps.map(([ico, t], i) => (
                  <View key={t} style={{ flexGrow: 1, flexBasis: wide ? '22%' : '46%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 18, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                    <Text style={{ color: GOLD, fontSize: 13, fontWeight: '800', marginBottom: 12 }}>0{i + 1}</Text>
                    <Ionicons name={ico} size={26} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15.5, marginTop: 12 }}>{t}</Text>
                  </View>
                ))}
              </View>
              <View style={{ alignItems: 'center', marginTop: 36 }}>
                <Btn variant="gold" label={db.me ? 'Go to dashboard' : 'Get started'} icon="arrow-forward" onPress={() => nav(db.me ? 'dashboard' : 'register')} />
                <Text onPress={() => setInfo('tutorial')} style={{ color: '#8fa3cc', marginTop: 18, textDecorationLine: 'underline' }}>Watch video tutorials ↗</Text>
              </View>
            </View>
            <View style={{ borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingVertical: 20, alignItems: 'center' }}>
              <Text style={{ color: '#6c80ab', fontSize: 12.5 }}>© 2026 Helmet Reservation Storage System</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

export default Home;
