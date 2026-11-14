import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useApp } from '../../shared/hooks/useApp';
import { login, register } from '../../services/authService';
import { okMail } from '../../shared/utils/date';
import { GOLD } from '../../shared/constants/theme';
import { Shield, Gradient, Btn, Field } from '../../components/common';

function Auth({ reg }) {
  const { signIn, nav, toast, s, c, width } = useApp();
  const wide = width >= 900;
  const [f, setF] = useState({ e: '', phone: '', p: '', c: '' });
  const [er, setEr] = useState('');
  const [busy, setBusy] = useState(false);
  const [student, setStudent] = useState(null);
  const [studentQr, setStudentQr] = useState('');
  const [camera, setCamera] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const scanLock = useRef(false);
  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }));

  const parseStudentQr = (payload) => {
    if (typeof payload !== 'string' || !payload.trim()) return { error: 'invalid' };
    const raw = payload.trim();
    const matches = [...raw.matchAll(/(?:^|\s)([0-9]{10})(?=\s|$)/g)];
    if (!matches.length) return { error: 'studentId' };
    if (matches.length !== 1) return { error: 'invalid' };
    const match = matches[0];
    const studentId = match[1];
    const idStart = match.index + match[0].length - studentId.length;
    const name = raw.slice(0, idStart).trim().replace(/\s+/g, ' ');
    const course = raw.slice(idStart + studentId.length).trim().replace(/\s+/g, ' ');
    if (!name) return { error: 'name' };
    if (!course) return { error: 'course' };
    if (name.length > 100 || course.length > 100) return { error: 'invalid' };
    return { student: { name, studentId, course } };
  };

  const scanError = (reason) => ({
    invalid: 'Invalid or unsupported QR code. Scan the student ID QR code again.',
    studentId: 'The QR code must contain a 10-digit student ID.',
    name: 'The QR code is missing the student name.',
    course: 'The QR code is missing the course or program.',
  }[reason] || 'Unable to read the student ID QR code. Please scan again.');

  const startScan = async () => {
    setEr('');
    setCameraBusy(true);
    try {
      if (!permission?.granted) {
        const result = await requestPermission();
        if (!result.granted) {
          setEr('Camera permission denied. Allow camera access to scan your student ID QR code.');
          return;
        }
      }
      setCamera(true);
    } catch (x) {
      setEr(x.message || 'Unable to start the camera. Please try again.');
    } finally {
      setCameraBusy(false);
    }
  };

  const onStudentQrScanned = ({ data }) => {
    if (scanLock.current) return;
    scanLock.current = true;
    setCamera(false);
    const result = parseStudentQr(data);
    if (result.error) {
      setEr(scanError(result.error));
    } else {
      setStudent(result.student);
      setStudentQr(data);
      setEr('');
    }
    setTimeout(() => { scanLock.current = false; }, 500);
  };

  const submit = async () => {
    const e = f.e.trim().toLowerCase();
    if (reg) {
      if (!student || !studentQr) return setEr('Scan your student ID QR code before registering.');
      if (!okMail(e)) return setEr('Please enter a valid email address.');
      if (!/^\+?[0-9\s()-]{7,30}$/.test(f.phone.trim())) return setEr('Please enter a valid phone number.');
      if (f.p.length < 8) return setEr('Password must be at least 8 characters.');
      if (f.p !== f.c) return setEr('Passwords do not match.');
    }
    setBusy(true); setEr('');
    try {
      const r = reg
        ? await register({
          name: student.name,
          studentId: student.studentId,
          course: student.course,
          studentQr,
          email: e,
          phone: f.phone.trim(),
          password: f.p,
        })
        : await login({ email: e, password: f.p });
      await signIn(r.token);
      if (reg) toast('Account created. Welcome!');
    } catch (x) { setEr(x.message); }
    setBusy(false);
  };

  const form = (
    <View style={{ width: '100%', maxWidth: 420 }}>
      {!wide && (
        <TouchableOpacity onPress={() => nav('home')} style={{ alignItems: 'center', marginBottom: 18 }}><Shield size={50} /></TouchableOpacity>
      )}
      <Text style={{ color: c.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.8 }}>{reg && !student ? 'Registration' : reg ? 'Create your account' : 'Welcome back'}</Text>
      <Text style={[s.muted, { marginTop: 6, marginBottom: 26 }]}>{reg && !student ? '' : reg ? 'Complete your account details to continue.' : 'Log in to manage your reservations.'}</Text>
      {reg && !student ? (
        <>
          {camera ? (
            <View style={{ height: 280, borderRadius: 16, overflow: 'hidden', marginBottom: 14, borderWidth: 2, borderColor: c.gold }}>
              <CameraView
                style={{ flex: 1 }}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={onStudentQrScanned}
              />
            </View>
          ) : (
            <View style={{ minHeight: 150, borderRadius: 16, borderWidth: 1, borderColor: c.line, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center', padding: 20, marginBottom: 14 }}>
              <Ionicons name="qr-code-outline" size={40} color={c.gold} />
              <Text style={[s.muted, { textAlign: 'center', marginTop: 10 }]}>Scan the QR code on your Student ID to continue.</Text>
            </View>
          )}
          {er ? <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: c.badBg, padding: 12, borderRadius: 12, marginBottom: 14 }}><Ionicons name="alert-circle-outline" size={18} color={c.bad} /><Text style={{ color: c.bad, flex: 1, fontWeight: '600' }}>{er}</Text></View> : null}
          <Btn
            full
            label={cameraBusy ? 'Requesting camera…' : camera ? 'Close camera' : 'Open camera'}
            icon={cameraBusy ? undefined : camera ? 'close' : 'camera-outline'}
            onPress={cameraBusy ? undefined : camera ? () => setCamera(false) : startScan}
          />

        </>
      ) : (
        <>
          {reg && student ? (
            <View style={{ borderWidth: 1, borderColor: c.line, backgroundColor: c.soft, borderRadius: 14, padding: 16, marginBottom: 18 }}>
              <Text style={{ color: c.text, fontWeight: '800', marginBottom: 10 }}>Scanned student ID details</Text>
              {[['Full name', student.name], ['Student ID', student.studentId], ['Course / program', student.course]].map(([label, value]) => (
                <View key={label} style={{ marginTop: 7 }}>
                  <Text style={[s.muted, { fontSize: 12 }]}>{label}</Text>
                  <Text selectable style={{ color: c.text, fontWeight: '700', marginTop: 2 }}>{value}</Text>
                </View>
              ))}

              <View style={{ marginTop: 12 }}>
                <Btn small variant="outline" icon="refresh-outline" label="Scan again" onPress={() => { setStudent(null); setStudentQr(''); setEr(''); startScan(); }} />
              </View>
            </View>
          ) : null}
          <Field label="Email" icon="mail-outline" value={f.e} onChangeText={set('e')} keyboardType="email-address" autoComplete="email" placeholder="you@example.com" />
          {reg && <Field label="Phone number" icon="call-outline" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" placeholder="+63 9XX XXX XXXX" />}
          <Field label="Password" icon="lock-closed-outline" secure value={f.p} onChangeText={set('p')} placeholder="At least 8 characters" onSubmitEditing={reg ? undefined : submit} />
          {reg && <Field label="Confirm password" icon="lock-closed-outline" secure value={f.c} onChangeText={set('c')} placeholder="Repeat password" onSubmitEditing={submit} />}
        </>
      )}
      {er && (!reg || student) ? <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: c.badBg, padding: 12, borderRadius: 12, marginBottom: 14 }}><Ionicons name="alert-circle-outline" size={18} color={c.bad} /><Text style={{ color: c.bad, flex: 1, fontWeight: '600' }}>{er}</Text></View> : null}
      {(!reg || student) ? <Btn full label={busy ? 'Please wait…' : reg ? 'Create account' : 'Log in'} icon={busy ? undefined : 'arrow-forward'} onPress={busy ? undefined : submit} /> : null}
      <Text style={{ color: c.muted, textAlign: 'center', marginTop: 22 }}>
        {reg ? 'Already registered? ' : 'Need an account? '}
        <Text onPress={() => nav(reg ? 'login' : 'register')} style={{ color: c.gold, fontWeight: '700' }}>{reg ? 'Log in' : 'Register'}</Text>
      </Text>
      <Text onPress={() => nav('home')} style={{ color: c.muted, textAlign: 'center', marginTop: 14, fontSize: 13 }}>← Back to home</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: c.bg }}>
      {wide && (
        <View style={{ flex: 1, overflow: 'hidden', justifyContent: 'space-between', padding: 48 }}>
          <Gradient id="authbg" from="#08122b" to="#17397f" />
          <View style={{ position: 'absolute', right: -100, bottom: -100, width: 360, height: 360, borderRadius: 180, backgroundColor: 'rgba(212,160,23,0.12)' }} />
          <TouchableOpacity onPress={() => nav('home')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Shield size={38} /><Text style={{ color: '#fff', fontWeight: '800', fontSize: 19, letterSpacing: 0.6 }}>SHSRS</Text></TouchableOpacity>
          <View>
            <Text style={{ color: '#fff', fontSize: 40, fontWeight: '800', letterSpacing: -1.2, lineHeight: 46 }}>Your helmet, <Text style={{ color: GOLD }}>safe</Text> and always within reach.</Text>
            <Text style={{ color: '#aebbd8', fontSize: 16.5, lineHeight: 26, marginTop: 16, maxWidth: 440 }}>Reserve a cabinet slot, submit payment for review, then use your verified QR code to unlock storage.</Text>
          </View>
          <Text style={{ color: '#6c80ab', fontSize: 12.5 }}>© 2026 Helmet Reservation Storage System</Text>
        </View>
      )}
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">{form}</ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

export default Auth;
