import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../shared/hooks/useApp';
import { api } from '../services/api';
import { longDate } from '../shared/utils/date';
import { dynamicStyles, staticStyles } from './navigation.styles';

function NotificationBell({ compact }) {
  const { db, refresh, nav, c, s, toast } = useApp();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const notifications = db.notifications || [];
  const unread = Number.isFinite(Number(db.unreadNotificationCount))
    ? Number(db.unreadNotificationCount)
    : notifications.filter((notification) => !notification.isRead).length;

  useEffect(() => {
    const interval = setInterval(() => {
      refresh().catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [refresh]);

  const markRead = async (notification) => {
    if (notification.isRead) return;
    await api('POST', `/api/notifications/${notification.id}/read`, {});
    await refresh();
  };

  const openNotification = async (notification) => {
    try {
      await markRead(notification);
      setVisible(false);
      if (notification.reservationId) {
        nav(['PAYMENT_VERIFIED','QR_AVAILABLE'].includes(notification.type) ? 'qr' : 'myReservations', notification.reservationId);
      }
    } catch (error) {
      toast(error.message);
    }
  };

  const markAllRead = async () => {
    setBusy(true);
    try {
      await api('POST', '/api/notifications/read-all', {});
      await refresh();
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        accessibilityLabel={`Notifications, ${unread} unread`}
        onPress={() => { setShowAll(false); setVisible(true); }}
        style={staticStyles.riderHeaderBell}
      >
        <Ionicons name="notifications-outline" size={22} color={compact ? '#fff' : c.text} />
        {unread > 0 ? (
          <View style={staticStyles.riderHeaderBadge}>
            <Text style={staticStyles.riderHeaderBadgeText}>{unread > 99 ? '99+' : unread}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={staticStyles.riderHeaderBackdrop} onPress={() => setVisible(false)}>
          <Pressable style={[staticStyles.riderHeaderPanel, { backgroundColor: c.card, borderColor: c.line }]} onPress={() => {}}>
            <View style={staticStyles.riderHeaderPanelHeading}>
              <View>
                <Text style={{ color: c.text, fontSize: 18, fontWeight: '800' }}>Notifications</Text>
                <Text style={{ color: c.muted, marginTop: 3 }}>{unread} unread</Text>
              </View>
              <TouchableOpacity accessibilityLabel="Close notifications" onPress={() => setVisible(false)}>
                <Ionicons name="close" size={22} color={c.muted} />
              </TouchableOpacity>
            </View>
            {unread > 0 ? (
              <TouchableOpacity disabled={busy} onPress={markAllRead} style={staticStyles.riderHeaderMarkAll}>
                <Text style={{ color: c.primary, fontWeight: '700' }}>{busy ? 'Updating…' : 'Mark all as read'}</Text>
              </TouchableOpacity>
            ) : null}
            <ScrollView style={staticStyles.riderHeaderNotificationList}>
              {notifications.length ? notifications.slice(0, showAll ? notifications.length : 5).map((notification) => {
                const createdAt = notification.createdAt
                  ? new Date(String(notification.createdAt).replace(' ', 'T')).toLocaleString()
                  : '';
                return (
                  <TouchableOpacity
                    key={notification.id}
                    onPress={() => openNotification(notification)}
                    style={[
                      staticStyles.riderHeaderNotification,
                      { backgroundColor: notification.isRead ? c.card : c.goldBg, borderColor: c.line },
                    ]}
                  >
                    <View style={staticStyles.riderHeaderNotificationTitle}>
                      <Text style={{ color: c.text, fontWeight: notification.isRead ? '600' : '800', flex: 1 }}>
                        {notification.title}
                      </Text>
                      {!notification.isRead ? <View style={[staticStyles.riderHeaderUnreadDot, { backgroundColor: c.gold }]} /> : null}
                    </View>
                    <Text style={{ color: c.muted, marginTop: 5, lineHeight: 20 }}>{notification.message}</Text>
                    <Text style={{ color: c.muted, fontSize: 12, marginTop: 7 }}>{createdAt}</Text>
                    {notification.reservationId ? (
                      <Text style={{ color: c.primary, fontWeight: '700', marginTop: 7 }}>View reservation</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              }) : <Text style={[s.empty, staticStyles.riderHeaderEmpty]}>No notifications yet.</Text>}
            </ScrollView>
            {notifications.length > 5 ? (
              <TouchableOpacity onPress={() => setShowAll(!showAll)} style={staticStyles.riderHeaderViewAll}>
                <Text style={{ color: c.primary, fontWeight: '800' }}>{showAll ? 'Show latest' : 'View all notifications'}</Text>
              </TouchableOpacity>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function RiderHeader({ compact, profileControl, rightControl, ...props }) {
  const { c, s } = useApp();
  if (compact) {
    return (
      <View style={staticStyles.riderHeaderControls}>
        <NotificationBell compact />
        {rightControl || null}
        {profileControl}
      </View>
    );
  }
  return (
    <View style={staticStyles.riderHeaderRow}>
      <View style={staticStyles.riderHeaderTitle}>
        <Text style={s.eyebrow}>{longDate()}</Text>
        <Text style={dynamicStyles.roleHeaderText2({ c })}>{props.title}</Text>
        {props.subtitle ? <Text style={[s.muted, staticStyles.roleHeaderText3]}>{props.subtitle}</Text> : null}
      </View>
      <View style={staticStyles.riderHeaderControls}>
        <NotificationBell />
        {rightControl || null}
        {profileControl}
      </View>
    </View>
  );
}

export default RiderHeader;
