import React, { useRef, useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useApp } from '../../shared/hooks/useApp';
import { login, register } from '../../services/authService';
import { okMail } from '../../shared/utils/date';
import { GOLD } from '../../shared/constants/theme';
import { Shield, Gradient, Btn, Field } from '../../components';
import { staticStyles, dynamicStyles } from '../../components/auth.styles';

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
    <View style={[staticStyles.authView1, dynamicStyles.authCard({ c })]}>
      {!wide && (
        <View style={staticStyles.authBrand}>
          <Shield size={52} />
          <View>
            <Text style={dynamicStyles.authBrandTitle({ c })}>HelMate</Text>
          </View>
        </View>
      )}
      <Text style={dynamicStyles.authText3({ c, wide })}>{reg && !student ? 'Registration' : reg ? 'Create your account' : 'Welcome back!'}</Text>
      <Text style={[s.muted, staticStyles.authText4]}>{reg && !student ? 'Create your account to reserve a locker.' : reg ? 'Complete your account details to continue.' : 'Log in to continue to your reservations.'}</Text>
      {reg && !student ? (
        <>
          {camera ? (
            <View style={dynamicStyles.authView5({ c })}>
              <CameraView
                style={staticStyles.authCameraView6}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={onStudentQrScanned}
              />
            </View>
          ) : (
            <View style={dynamicStyles.authView7({ c })}>
              <Ionicons name="qr-code-outline" size={40} color={c.gold} />
          <Text style={[s.muted, staticStyles.authText8]}>Scan the QR code on your Student ID to continue.</Text>
            </View>
          )}
          {er ? <View style={dynamicStyles.authView9({ c })}><Ionicons name="alert-circle-outline" size={18} color={c.bad} /><Text style={dynamicStyles.authText10({ c })}>{er}</Text></View> : null}
          <Btn
            full
            fontFamily="NunitoSansBold"
            label={cameraBusy ? 'Requesting camera…' : camera ? 'Close camera' : 'Open camera'}
            icon={cameraBusy ? undefined : camera ? 'close' : 'camera-outline'}
            onPress={cameraBusy ? undefined : camera ? () => setCamera(false) : startScan}
          />

        </>
      ) : (
        <>
          {reg && student ? (
            <View style={dynamicStyles.authView11({ c })}>
              <Text style={dynamicStyles.authText12({ c })}>Scanned student ID details</Text>
              {[['Full name', student.name], ['Student ID', student.studentId], ['Course / program', student.course]].map(([label, value]) => (
                <View key={label} style={staticStyles.authView13}>
                  <Text style={[s.muted, staticStyles.authText14]}>{label}</Text>
                  <Text selectable style={dynamicStyles.authText15({ c })}>{value}</Text>
                </View>
              ))}

              <View style={staticStyles.authView16}>
                <Btn small fontFamily="NunitoSansBold" variant="outline" icon="refresh-outline" label="Scan again" onPress={() => { setStudent(null); setStudentQr(''); setEr(''); startScan(); }} />
              </View>
            </View>
          ) : null}
          <Field label="Email" icon="mail-outline" fontFamily="NunitoSans" labelFontFamily="NunitoSansSemiBold" value={f.e} onChangeText={set('e')} keyboardType="email-address" autoComplete="email" placeholder="you@example.com" />
          {reg && <Field label="Phone number" icon="call-outline" fontFamily="NunitoSans" labelFontFamily="NunitoSansSemiBold" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" placeholder="+63 9XX XXX XXXX" />}
          <Field label="Password" icon="lock-closed-outline" fontFamily="NunitoSans" labelFontFamily="NunitoSansSemiBold" secure value={f.p} onChangeText={set('p')} placeholder="At least 8 characters" onSubmitEditing={reg ? undefined : submit} />
          {reg && <Field label="Confirm password" icon="lock-closed-outline" fontFamily="NunitoSans" labelFontFamily="NunitoSansSemiBold" secure value={f.c} onChangeText={set('c')} placeholder="Repeat password" onSubmitEditing={submit} />}
        </>
      )}
      {er && (!reg || student) ? <View style={dynamicStyles.authView9({ c })}><Ionicons name="alert-circle-outline" size={18} color={c.bad} /><Text style={dynamicStyles.authText10({ c })}>{er}</Text></View> : null}
      {(!reg || student) ? <Btn full fontFamily="NunitoSansBold" label={busy ? 'Please wait…' : reg ? 'Create account' : 'Log in'} icon={busy ? undefined : 'arrow-forward'} onPress={busy ? undefined : submit} /> : null}
      <Text style={dynamicStyles.authText19({ c })}>
        {reg ? 'Already registered? ' : 'Need an account? '}
        <Text onPress={() => nav(reg ? 'login' : 'register')} style={dynamicStyles.authText20({ c })}>{reg ? 'Log in' : 'Register'}</Text>
      </Text>
    </View>
  );

  return (
    <View style={dynamicStyles.authView22({ c })}>
      {wide && (
        <View style={staticStyles.authView23}>
          <Gradient id="authbg" from="#08122b" to="#17397f" />
          <View style={staticStyles.authView24} />
          <View style={staticStyles.authBrandWide}>
            <Shield size={58} />
            <View>
              <Text style={staticStyles.authText26}>HelMate</Text>
            </View>
          </View>
          <View>
            <Text style={staticStyles.authText27}>Your helmet, <Text style={dynamicStyles.authText28({ GOLD })}>safe</Text> and always within reach.</Text>
            <Text style={staticStyles.authText29}>Reserve a locker, submit payment for review, then use your verified QR code to access it.</Text>
          </View>
          <Text style={staticStyles.authText30}>© 2026 Helmet Reservation Storage System</Text>
        </View>
      )}
      <SafeAreaView style={dynamicStyles.authFormArea({ c })}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={staticStyles.authCameraView6}>
          <ScrollView contentContainerStyle={staticStyles.authContentContainer1} keyboardShouldPersistTaps="handled">{form}</ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

export default Auth;
