import React, { useState } from 'react';
import { View, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../../shared/hooks/useApp';
import { updateProfile, updateProfilePhoto, updatePassword, deleteAccount } from '../../services/userService';
import { okMail } from '../../shared/utils/date';
import { confirmBox } from '../../shared/utils/actions';
import { Layout, Avatar, Btn, Field } from '../../components/common';

function Profile() {
  const { me, refresh, logout, toast, s, c, wide } = useApp();
  const [n, setN] = useState(me.name); const [e, setE] = useState(me.email); const [phone, setPhone] = useState(me.phone || ''); const [er, setEr] = useState('');
  const [cp, setCp] = useState(''); const [np, setNp] = useState(''); const [cf, setCf] = useState(''); const [er2, setEr2] = useState('');

  const pick = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.3, base64: true });
    if (r.canceled || !r.assets?.[0]?.base64) return;
    try { await updateProfilePhoto('data:image/jpeg;base64,' + r.assets[0].base64); await refresh(); toast('Profile photo updated.'); }
    catch (x) { toast(x.message); }
  };
  const rm = async () => { try { await updateProfilePhoto(''); await refresh(); } catch (x) { toast(x.message); } };
  const saveProf = async () => {
    const em = e.trim().toLowerCase();
    if (!n.trim()) return setEr('Name is required.');
    if (!okMail(em)) return setEr('Enter a valid email address.');
    if (!/^\+?[0-9\s()-]{7,30}$/.test(phone.trim())) return setEr('Enter a valid phone number.');
    try { await updateProfile({ name: n.trim(), email: em, phone: phone.trim() }); await refresh(); setEr(''); toast('Profile saved.'); }
    catch (x) { setEr(x.message); }
  };
  const savePw = async () => {
    if (np.length < 8) return setEr2('New password must be at least 8 characters.');
    if (np !== cf) return setEr2('Passwords do not match.');
    try { await updatePassword(cp, np); setCp(''); setNp(''); setCf(''); setEr2(''); toast('Password updated.'); }
    catch (x) { setEr2(x.message); }
  };
  const del = () => confirmBox('Delete account', 'Delete your account and all reservations? This cannot be undone.', 'Delete', async () => {
    try { await deleteAccount(); logout(); } catch (x) { toast(x.message); }
  });

  return (
    <Layout cur="profile" title="Profile" subtitle="Manage your account details and security.">
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 18, alignItems: 'flex-start' }}>
        <View style={{ flex: wide ? 1 : undefined, width: wide ? undefined : '100%' }}>
          <View style={s.card}>
            <Text style={s.cardTitle}>Profile information</Text>
            <Text style={[s.cardSub, { marginBottom: 18 }]}>Update your account&apos;s profile information and email address.</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, marginBottom: 20 }}>
              <Avatar u={me} size={84} ring />
              <View style={{ gap: 8 }}>
                <Btn small variant="outline" icon="image-outline" label="Upload photo" onPress={pick} />
                {me.photo ? <Btn small variant="outline" label="Remove photo" onPress={rm} /> : null}
              </View>
            </View>
            <Field label="Name" icon="person-outline" value={n} onChangeText={setN} autoCapitalize="words" />
            <Field label="Email" icon="mail-outline" value={e} onChangeText={setE} keyboardType="email-address" />
            <Field label="Phone number" icon="call-outline" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+63 9XX XXX XXXX" />
            {er ? <Text style={s.err}>{er}</Text> : null}
            <Btn label="Save changes" onPress={saveProf} />
          </View>
        </View>
        <View style={{ flex: wide ? 1 : undefined, width: wide ? undefined : '100%' }}>
          <View style={s.card}>
            <Text style={s.cardTitle}>Update password</Text>
            <Text style={[s.cardSub, { marginBottom: 18 }]}>Use a long, random password to stay secure.</Text>
            <Field label="Current password" icon="lock-closed-outline" secure value={cp} onChangeText={setCp} />
            <Field label="New password" icon="key-outline" secure value={np} onChangeText={setNp} />
            <Field label="Confirm password" icon="key-outline" secure value={cf} onChangeText={setCf} />
            {er2 ? <Text style={s.err}>{er2}</Text> : null}
            <Btn label="Update password" onPress={savePw} />
          </View>
          <View style={[s.card, { borderColor: c.bad }]}>
            <Text style={[s.cardTitle, { color: c.bad }]}>Delete account</Text>
            <Text style={[s.cardSub, { marginBottom: 16 }]}>Permanently deletes your account and all your reservations.</Text>
            <Btn variant="danger" icon="trash-outline" label="Delete account" onPress={del} />
          </View>
        </View>
      </View>
    </Layout>
  );
}

export default Profile;
