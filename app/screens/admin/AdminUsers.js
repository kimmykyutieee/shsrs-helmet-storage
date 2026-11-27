import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useApp } from '../../shared/hooks/useApp';
import { deleteAdminUser, updateAdminUser } from '../../services/userService';
import { confirmBox } from '../../shared/utils/actions';
import { okMail } from '../../shared/utils/date';
import { Layout, Btn, InfoModal, Tag, IconBox } from '../../components';
import { staticStyles, dynamicStyles } from '../../components/admin.styles';

function AdminUsers() {
  const { db, refresh, toast, s, c } = useApp();
  const [busyUser, setBusyUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);
  const userRole = (user) => user.admin ? 'Admin' : user.finance ? 'Finance' : user.security ? 'Security' : 'Rider';
  const openEdit = (user) => {
    setEditingUser({ id: user.id, name: user.name, email: user.email, role: userRole(user) });
    setEditError('');
  };
  const removeUser = (user) => {
    if (user.id === db.me) return toast('You cannot delete the account you are using.');
    if (user.admin) return toast('Administrator accounts cannot be deleted.');
    confirmBox(
      'Delete user',
      `Delete ${user.name}? This will permanently remove the rider account and all related reservation, payment, extension, refund, notification, access log, and cabinet command records.`,
      'Delete user',
      async () => {
        setBusyUser(user.id);
        try {
          await deleteAdminUser(user.id);
          await refresh();
          toast(`${user.name} was deleted.`);
        } catch (error) { toast(error.message); }
        finally { setBusyUser(null); }
      },
    );
  };
  const saveUser = async () => {
    if (!editingUser) return;
    const userId = editingUser.id;
    const name = editingUser.name.trim();
    const email = editingUser.email.trim().toLowerCase();
    if (!name) return setEditError('Full name is required.');
    if (!okMail(email)) return setEditError('Enter a valid email address.');

    setSaving(true);
    setEditError('');
    try {
      await updateAdminUser(userId, { name, email });
      await refresh();
      setEditingUser(null);
      toast('User details updated.');
    } catch (error) {
      setEditError(error.message);
    } finally {
      setSaving(false);
    }
  };
  const closeEdit = () => {
    if (saving) return;
    setEditingUser(null);
    setEditError('');
  };

  return (
    <Layout cur="adminUsers" title="Users" subtitle="Manage accounts. Staff roles are set in the database.">
      <View style={staticStyles.adminUsersList}>
        <View style={staticStyles.adminUsersListHeader}>
          <View><Text style={s.cardTitle}>User accounts</Text><Text style={s.cardSub}>Manage rider accounts and view staff access</Text></View>
          <Text style={[s.cardSub, staticStyles.adminUsersCount, dynamicStyles.adminUsersCount({ c })]}>{db.users.length} total</Text>
        </View>
        {db.users.length ? db.users.map((user) => (
          <View key={user.id} style={[s.card, staticStyles.adminUserCard]}>
            <View style={staticStyles.adminUsersIdentity}>
              <View style={[staticStyles.adminUserAvatar, { backgroundColor:c.goldBg }]}><Text style={{ color:c.gold, fontWeight:'800', fontSize:16 }}>{user.name?.[0]?.toUpperCase() || '?'}</Text></View>
              <View style={staticStyles.adminReservationsView3}>
                <Text style={dynamicStyles.adminUsersText4({ c })}>{user.name}</Text>
                <Text style={s.muted}>{user.email}</Text>
              </View>
              <Tag
                kind={user.admin || user.finance || user.security ? 'gold' : 'mute'}
                text={!user.admin && !user.finance && !user.security && user.memberType === 'Faculty' ? 'Faculty Rider' : userRole(user)}
              />
            </View>
            <View style={staticStyles.adminUsersActions}>
              <Btn small variant="outline" label="Edit" onPress={busyUser === user.id ? undefined : () => openEdit(user)} />
              {!user.admin && !user.finance && !user.security ? (
                <Btn small variant="outline" icon="trash-outline" label="Delete" onPress={busyUser === user.id ? undefined : () => removeUser(user)} />
              ) : null}
            </View>
          </View>
        )) : <View style={[s.card, staticStyles.adminEmptyState]}><IconBox icon="people-outline" tone="gold" size={48} /><Text style={s.empty}>No user accounts found.</Text></View>}
      </View>
      <InfoModal visible={!!editingUser} title="Edit user" onClose={closeEdit}>
        {editingUser ? (
          <>
            <View style={staticStyles.adminUsersModalField}>
              <Text style={s.label}>Full Name</Text>
              <TextInput
                style={s.input}
                value={editingUser.name}
                onChangeText={(name) => { setEditingUser((current) => ({ ...current, name })); setEditError(''); }}
                maxLength={100}
                autoCapitalize="words"
                placeholder="Full name"
                placeholderTextColor={c.muted}
              />
            </View>
            <View style={staticStyles.adminUsersModalField}>
              <Text style={s.label}>Gmail/Email Address</Text>
              <TextInput
                style={s.input}
                value={editingUser.email}
                onChangeText={(email) => { setEditingUser((current) => ({ ...current, email })); setEditError(''); }}
                maxLength={150}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="Email address"
                placeholderTextColor={c.muted}
              />
            </View>
            <View style={staticStyles.adminUsersModalField}>
              <Text style={s.label}>Role</Text>
              <Text style={s.cardSub}>{editingUser.role} · Role is managed in the database.</Text>
            </View>
            {editError ? <Text style={[s.err, staticStyles.adminUsersModalField]}>{editError}</Text> : null}
            <View style={staticStyles.adminUsersModalActions}>
              <Btn small variant="outline" label="Cancel" onPress={closeEdit} />
              <Btn small label={saving ? 'Saving...' : 'Save Changes'} onPress={saving ? undefined : saveUser} />
            </View>
          </>
        ) : null}
      </InfoModal>
    </Layout>
  );
}

export default AdminUsers;
