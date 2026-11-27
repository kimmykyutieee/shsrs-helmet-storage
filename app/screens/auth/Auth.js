import React, { useRef, useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useApp } from '../../shared/hooks/useApp';
import { completePasswordReset, login, register, requestPasswordReset } from '../../services/authService';
import { updatePassword } from '../../services/userService';
import { setToken } from '../../services/api';
import { okMail } from '../../shared/utils/date';
import { GOLD } from '../../shared/constants/theme';
import { Shield, Gradient, Btn, Field, InfoModal } from '../../components';
import { staticStyles, dynamicStyles } from '../../components/auth.styles';

function Auth({ reg }) {
  const { signIn, nav, toast, s, c, width } = useApp();
  const wide = width >= 900;
  const [f, setF] = useState({ e: '', phone: '', p: '', c: '' });
  const [er, setEr] = useState('');
  const [busy, setBusy] = useState(false);
  const [passwordChangeToken, setPasswordChangeToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [showRecoveryHelp, setShowRecoveryHelp] = useState(false);
  const [recoveryStage, setRecoveryStage] = useState('email');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryPasswordConfirm, setRecoveryPasswordConfirm] = useState('');
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const [identity, setIdentity] = useState(null);
  const [identityQr, setIdentityQr] = useState('');
  const [camera, setCamera] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const scanLock = useRef(false);
  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }));

  const parseIdentityQr = (payload) => {
    if (typeof payload !== 'string' || !payload.trim()) return { error: 'invalid' };
    const raw = payload.trim();
    const matches = [...raw.matchAll(/(?:^|\s)([0-9]{7}|[0-9]{10})(?=\s|$)/g)];
    if (!matches.length) return { error: 'memberId' };
    if (matches.length !== 1) return { error: 'invalid' };
    const match = matches[0];
    const memberId = match[1];
    const idStart = match.index + match[0].length - memberId.length;
    const name = raw.slice(0, idStart).trim().replace(/\s+/g, ' ');
    const affiliation = raw.slice(idStart + memberId.length).trim().replace(/\s+/g, ' ');
    if (!name) return { error: 'name' };
    if (!affiliation) return { error: 'affiliation' };
    if (name.length > 100 || affiliation.length > 100) return { error: 'invalid' };
    return {
      identity: {
        name,
        memberId,
        memberType: memberId.length === 10 ? 'Student' : 'Faculty',
        affiliation,
      },
    };
  };

  const scanError = (reason) => ({
    invalid: 'Invalid or unsupported QR code. Scan a USTP student or faculty ID again.',
    memberId: 'The QR code must contain a 10-digit student ID or 7-digit faculty ID.',
    name: 'The QR code is missing the cardholder name.',
    affiliation: 'The QR code is missing the course/program or faculty position/address.',
  }[reason] || 'Unable to read the USTP ID QR code. Please scan again.');

  const startScan = async () => {
    setEr('');
    setCameraBusy(true);
    try {
      if (!permission?.granted) {
        const result = await requestPermission();
        if (!result.granted) {
          setEr('Camera permission denied. Allow camera access to scan your USTP ID QR code.');
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

  const onIdentityQrScanned = ({ data }) => {
    if (scanLock.current) return;
    scanLock.current = true;
    setCamera(false);
    const result = parseIdentityQr(data);
    if (result.error) {
      setEr(scanError(result.error));
    } else {
      setIdentity(result.identity);
      setIdentityQr(data);
      setEr('');
    }
    setTimeout(() => { scanLock.current = false; }, 500);
  };

  const submit = async () => {
    const e = f.e.trim().toLowerCase();
    if (reg) {
      if (!identity || !identityQr) return setEr('Scan your USTP student or faculty ID QR code before registering.');
      if (!okMail(e)) return setEr('Please enter a valid email address.');
      if (!/^\+?[0-9\s()-]{7,30}$/.test(f.phone.trim())) return setEr('Please enter a valid phone number.');
      if (f.p.length < 8) return setEr('Password must be at least 8 characters.');
      if (f.p !== f.c) return setEr('Passwords do not match.');
    }
    setBusy(true); setEr('');
    try {
      const r = reg
        ? await register({
          name: identity.name,
          memberId: identity.memberId,
          memberType: identity.memberType,
          affiliation: identity.affiliation,
          identityQr,
          email: e,
          phone: f.phone.trim(),
          password: f.p,
        })
        : await login({ email: e, password: f.p });
      if (!reg && r.mustChangePassword) {
        setToken(r.token);
        setPasswordChangeToken(r.token);
        setNewPassword('');
        setNewPasswordConfirm('');
      } else {
        await signIn(r.token);
        if (reg) toast('Account created. Welcome!');
      }
    } catch (x) { setEr(x.message); }
    setBusy(false);
  };

  const sendPasswordResetCode = async () => {
    const email = recoveryEmail.trim().toLowerCase();
    if (!okMail(email)) return setRecoveryError('Enter the email address linked to your account.');
    setRecoveryBusy(true);
    setRecoveryError('');
    try {
      await requestPasswordReset(email);
      setRecoveryEmail(email);
      setRecoveryCode('');
      setRecoveryStage('code');
    } catch (error) {
      setRecoveryError(error.message);
    } finally {
      setRecoveryBusy(false);
    }
  };

  const submitPasswordReset = async () => {
    if (!/^\d{6}$/.test(recoveryCode.trim())) return setRecoveryError('Enter the 6-digit verification code.');
    if (recoveryPassword.length < 8) return setRecoveryError('New password must be at least 8 characters.');
    if (recoveryPassword !== recoveryPasswordConfirm) return setRecoveryError('Passwords do not match.');
    setRecoveryBusy(true);
    setRecoveryError('');
    try {
      await completePasswordReset(recoveryEmail, recoveryCode.trim(), recoveryPassword);
      setRecoveryPassword('');
      setRecoveryPasswordConfirm('');
      setF((current) => ({ ...current, e: recoveryEmail, p: '' }));
      setRecoveryStage('complete');
    } catch (error) {
      setRecoveryError(error.message);
    } finally {
      setRecoveryBusy(false);
    }
  };

  const closePasswordRecovery = () => {
    setShowRecoveryHelp(false);
    setRecoveryError('');
  };

  const submitNewPassword = async () => {
    if (newPassword.length < 8) return setEr('New password must be at least 8 characters.');
    if (newPassword === f.p) return setEr('Choose a different new password.');
    if (newPassword !== newPasswordConfirm) return setEr('Passwords do not match.');
    setBusy(true); setEr('');
    try {
      await updatePassword(f.p, newPassword);
      setPasswordChangeToken('');
      setF((current) => ({ ...current, p: '', c: '' }));
      setNewPassword('');
      setNewPasswordConfirm('');
      try {
        await signIn(passwordChangeToken);
        toast('Password updated. Welcome!');
      } catch (error) {
        setEr(`Your password was changed. Please sign in with your new password. ${error.message}`);
      }
    } catch (x) { setEr(x.message); }
    setBusy(false);
  };

  const cancelPasswordChange = () => {
    setToken(null);
    setPasswordChangeToken('');
    setNewPassword('');
    setNewPasswordConfirm('');
    setF((current) => ({ ...current, p: '' }));
    setEr('');
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
      <Text style={dynamicStyles.authText3({ c, wide })}>{passwordChangeToken ? 'Choose a new password' : reg && !identity ? 'Registration' : reg ? 'Create your account' : 'Welcome back!'}</Text>
      <Text style={[s.muted, staticStyles.authText4]}>
        {passwordChangeToken ? 'Your administrator gave you a temporary password. Set a new password to continue.' : reg && !identity ? 'Create your account to reserve a locker.' : reg ? 'Complete your account details to continue.' : 'Log in to continue to your reservations.'}
      </Text>
      {reg && !identity ? (
        <>
          {camera ? (
            <View style={dynamicStyles.authView5({ c })}>
              <CameraView
                style={staticStyles.authCameraView6}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={onIdentityQrScanned}
              />
            </View>
          ) : (
            <View style={dynamicStyles.authView7({ c })}>
              <Ionicons name="qr-code-outline" size={40} color={c.gold} />
          <Text style={[s.muted, staticStyles.authText8]}>Scan the QR code on your USTP student or faculty ID to continue.</Text>
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
      ) : passwordChangeToken ? (
        <>
          <Field label="New password" icon="key-outline" fontFamily="NunitoSans" labelFontFamily="NunitoSansSemiBold" secure value={newPassword} onChangeText={setNewPassword} placeholder="At least 8 characters" />
          <Field label="Confirm new password" icon="key-outline" fontFamily="NunitoSans" labelFontFamily="NunitoSansSemiBold" secure value={newPasswordConfirm} onChangeText={setNewPasswordConfirm} placeholder="Enter your new password again" onSubmitEditing={submitNewPassword} />
        </>
      ) : (
        <>
          {reg && identity ? (
            <View style={dynamicStyles.authView11({ c })}>
              <Text style={dynamicStyles.authText12({ c })}>Scanned {identity.memberType.toLowerCase()} ID details</Text>
              {[
                ['Account type', identity.memberType],
                ['Full name', identity.name],
                [`${identity.memberType} ID`, identity.memberId],
                [identity.memberType === 'Faculty' ? 'Position | Address' : 'Course / program', identity.affiliation],
              ].map(([label, value]) => (
                <View key={label} style={staticStyles.authView13}>
                  <Text style={[s.muted, staticStyles.authText14]}>{label}</Text>
                  <Text selectable style={dynamicStyles.authText15({ c })}>{value}</Text>
                </View>
              ))}

              <View style={staticStyles.authView16}>
                <Btn small fontFamily="NunitoSansBold" variant="outline" icon="refresh-outline" label="Scan again" onPress={() => { setIdentity(null); setIdentityQr(''); setEr(''); startScan(); }} />
              </View>
            </View>
          ) : null}
          <Field label="Email" icon="mail-outline" fontFamily="NunitoSans" labelFontFamily="NunitoSansSemiBold" value={f.e} onChangeText={set('e')} keyboardType="email-address" autoComplete="email" placeholder="you@example.com" />
          {reg && <Field label="Phone number" icon="call-outline" fontFamily="NunitoSans" labelFontFamily="NunitoSansSemiBold" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" placeholder="+63 9XX XXX XXXX" />}
          <Field label="Password" icon="lock-closed-outline" fontFamily="NunitoSans" labelFontFamily="NunitoSansSemiBold" secure value={f.p} onChangeText={set('p')} placeholder="At least 8 characters" onSubmitEditing={reg ? undefined : submit} />
          {reg && <Field label="Confirm password" icon="lock-closed-outline" fontFamily="NunitoSans" labelFontFamily="NunitoSansSemiBold" secure value={f.c} onChangeText={set('c')} placeholder="Repeat password" onSubmitEditing={submit} />}
        </>
      )}
      {er && (!reg || identity) ? <View style={dynamicStyles.authView9({ c })}><Ionicons name="alert-circle-outline" size={18} color={c.bad} /><Text style={dynamicStyles.authText10({ c })}>{er}</Text></View> : null}
      {passwordChangeToken
        ? <>
          <Btn full fontFamily="NunitoSansBold" label={busy ? 'Updating password…' : 'Set new password'} icon={busy ? undefined : 'checkmark'} onPress={busy ? undefined : submitNewPassword} />
          <Text onPress={busy ? undefined : cancelPasswordChange} style={dynamicStyles.authText20({ c })}>Back to sign in</Text>
        </>
        : (!reg || identity) ? <Btn full fontFamily="NunitoSansBold" label={busy ? 'Please wait…' : reg ? 'Create account' : 'Log in'} icon={busy ? undefined : 'arrow-forward'} onPress={busy ? undefined : submit} /> : null}
      {!reg && !passwordChangeToken ? (
        <View style={{ alignItems:'center', marginTop:12 }}>
          <Text onPress={() => {
            setRecoveryStage('email');
            setRecoveryError('');
            setShowRecoveryHelp(true);
          }} style={dynamicStyles.authText20({ c })}>Forgot password?</Text>
        </View>
      ) : null}
      {!passwordChangeToken ? (
        <Text style={dynamicStyles.authText19({ c })}>
          {reg ? 'Already registered? ' : 'Need an account? '}
          <Text onPress={() => nav(reg ? 'login' : 'register')} style={dynamicStyles.authText20({ c })}>{reg ? 'Log in' : 'Register'}</Text>
        </Text>
      ) : null}
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
      <InfoModal visible={showRecoveryHelp} title={recoveryStage === 'complete' ? 'Password reset complete' : 'Forgot password?'} onClose={closePasswordRecovery}>
        {recoveryStage === 'email' ? (
          <>
            <Text style={[s.muted, staticStyles.authText4]}>Enter your account email. If a rider account uses it, we’ll send a verification code. The code expires in 15 minutes.</Text>
            <Field
              label="Email"
              icon="mail-outline"
              fontFamily="NunitoSans"
              labelFontFamily="NunitoSansSemiBold"
              value={recoveryEmail}
              onChangeText={setRecoveryEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="you@example.com"
              onSubmitEditing={sendPasswordResetCode}
            />
            {recoveryError ? <Text style={[s.err, staticStyles.authText4]}>{recoveryError}</Text> : null}
            <View style={{ marginTop:16 }}>
              <Btn full label={recoveryBusy ? 'Sending code…' : 'Send verification code'} onPress={recoveryBusy ? undefined : sendPasswordResetCode} />
            </View>
          </>
        ) : recoveryStage === 'code' ? (
          <>
            <Text style={[s.muted, staticStyles.authText4]}>Enter the 6-digit code sent to {recoveryEmail}. It expires in 15 minutes.</Text>
            <Field
              label="Verification code"
              icon="key-outline"
              fontFamily="NunitoSans"
              labelFontFamily="NunitoSansSemiBold"
              value={recoveryCode}
              onChangeText={setRecoveryCode}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="6-digit code"
            />
            <Field label="New password" icon="lock-closed-outline" fontFamily="NunitoSans" labelFontFamily="NunitoSansSemiBold" secure value={recoveryPassword} onChangeText={setRecoveryPassword} placeholder="At least 8 characters" />
            <Field label="Confirm new password" icon="lock-closed-outline" fontFamily="NunitoSans" labelFontFamily="NunitoSansSemiBold" secure value={recoveryPasswordConfirm} onChangeText={setRecoveryPasswordConfirm} placeholder="Repeat new password" onSubmitEditing={submitPasswordReset} />
            {recoveryError ? <Text style={[s.err, staticStyles.authText4]}>{recoveryError}</Text> : null}
            <View style={{ marginTop:16 }}>
              <Btn full label={recoveryBusy ? 'Updating password…' : 'Verify code and reset password'} onPress={recoveryBusy ? undefined : submitPasswordReset} />
              <View style={{ marginTop:10 }}>
                <Btn full variant="outline" label={recoveryBusy ? 'Please wait…' : 'Send a new code'} onPress={recoveryBusy ? undefined : sendPasswordResetCode} />
              </View>
            </View>
          </>
        ) : (
          <>
            <Text style={[s.muted, staticStyles.authText4]}>Your password has been updated. Sign in with your new password.</Text>
            <View style={{ marginTop:16 }}>
              <Btn full label="Done" onPress={closePasswordRecovery} />
            </View>
          </>
        )}
      </InfoModal>
    </View>
  );
}

export default Auth;
