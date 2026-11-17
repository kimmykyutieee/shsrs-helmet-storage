import React from 'react';
import { View, Text, StatusBar, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../shared/hooks/useApp';
import { NAVY, GOLD } from '../../shared/constants/theme';
import { Shield, Gradient, Btn } from '../../components';
import { staticStyles, dynamicStyles } from '../../components/home.styles';

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
    <View style={dynamicStyles.homeView1({ NAVY })}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={staticStyles.homeSafeAreaView2}>
        <ScrollView contentContainerStyle={staticStyles.homeScrollViewContent1}>
          <View style={staticStyles.homeView3}>
            <Gradient id="hero" from="#08122b" to="#17397f" />
            <View style={staticStyles.homeView4} />
            <View style={staticStyles.homeView5} />
            <View style={dynamicStyles.homeView6({ pad2, wide })}>
              <View style={dynamicStyles.homeView7({ wide })}>
                <View style={staticStyles.homeView8}>
                  <Shield size={32} /><Text style={staticStyles.homeText9}>HelMate</Text>
                </View>
                <View style={staticStyles.homeView10}>
                  {db.me ? <Btn small variant="ghostDark" label="Dashboard" onPress={() => nav('dashboard')} /> : (
                    <>
                      <Btn small variant="ghostDark" label="Log in" onPress={() => nav('login')} />
                      <Btn small variant="gold" label="Register" onPress={() => nav('register')} />
                    </>
                  )}
                </View>
              </View>
              <View style={dynamicStyles.homeView11({ wide })}>
                <View style={dynamicStyles.homeView12({ wide })}>
                  <View style={staticStyles.homeView13}>
                    <Ionicons name="shield-checkmark" size={14} color={GOLD} />
                    <Text style={staticStyles.homeText14}>SMART HELMET STORAGE</Text>
                  </View>
                  <Text style={dynamicStyles.homeText15({ wide })}>
                    Secure helmet storage, <Text style={dynamicStyles.homeText16({ GOLD })}>reserved in seconds.</Text>
                  </Text>
                  <Text style={dynamicStyles.homeText17({ wide })}>
                    Manage and reserve safety helmets efficiently. Book a cabinet slot, submit payment for review, and access your QR code after verification.
                  </Text>
                  <View style={staticStyles.homeView18}>
                    <Btn variant="gold" icon="arrow-forward" label="Reserve now" onPress={() => nav(db.me ? 'reservations' : 'login')} />
                    <Btn variant="ghostDark" icon="book-outline" label="System manual" onPress={() => setInfo('manual')} />
                  </View>
                  <View style={dynamicStyles.homeView19({ wide })}>
                    {[['12', 'Secure slots'], ['QR', 'One-scan access'], ['Live', 'Availability']].map(([a, b]) => (
                      <View key={b}><Text style={staticStyles.homeText20}>{a}</Text><Text style={staticStyles.homeText21}>{b}</Text></View>
                    ))}
                  </View>
                </View>
                {wide ? (
                  <View style={staticStyles.homeView22}>
                    <View style={staticStyles.homeView23} />
                    <View style={staticStyles.homeView24} />
                    <Shield size={170} />
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          <View style={staticStyles.homeView25}>
            <View style={dynamicStyles.homeView26({ pad2, wide })}>
              <Text style={staticStyles.homeText27}>WHY SHSRS</Text>
              <Text style={dynamicStyles.homeText28({ wide })}>Everything you need to store a helmet safely</Text>
              <View style={staticStyles.homeView29}>
                {features.map(([ico, t, d]) => (
                  <View key={t} style={dynamicStyles.homeView30({ wide })}>
                    <View style={staticStyles.homeView31}><Ionicons name={ico} size={22} color="#B7791F" /></View>
                    <Text style={staticStyles.homeText32}>{t}</Text>
                    <Text style={staticStyles.homeText33}>{d}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={dynamicStyles.homeView34({ NAVY })}>
            <View style={dynamicStyles.homeView35({ pad2, wide })}>
              <Text style={dynamicStyles.homeText36({ GOLD })}>HOW IT WORKS</Text>
              <Text style={dynamicStyles.homeText37({ wide })}>Four simple steps</Text>
              <View style={staticStyles.homeView29}>
                {steps.map(([ico, t], i) => (
                  <View key={t} style={dynamicStyles.homeView39({ wide })}>
                    <Text style={dynamicStyles.homeText40({ GOLD })}>0{i + 1}</Text>
                    <Ionicons name={ico} size={26} color="#fff" />
                    <Text style={staticStyles.homeText41}>{t}</Text>
                  </View>
                ))}
              </View>
              <View style={staticStyles.homeView42}>
                <Btn variant="gold" label={db.me ? 'Go to dashboard' : 'Get started'} icon="arrow-forward" onPress={() => nav(db.me ? 'dashboard' : 'register')} />
                <Text onPress={() => setInfo('tutorial')} style={staticStyles.homeText43}>Watch video tutorials ↗</Text>
              </View>
            </View>
            <View style={staticStyles.homeView44}>
              <Text style={staticStyles.homeText45}>© 2026 Helmet Reservation Storage System</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

export default Home;
