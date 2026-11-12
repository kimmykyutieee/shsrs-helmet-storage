import React, { useState, useRef } from 'react';
import { View, Text, TextInput } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../shared/hooks/useApp';
import { scanCabinet } from '../../services/cabinetService';
import { today, isPast } from '../../shared/utils/date';
import { GOLD } from '../../shared/constants/theme';
import { Layout, Btn, LogList } from '../../components/common';

function Scan() {
  const { db, refresh, mine, s, c, wide } = useApp();
  const [v, setV] = useState('');
  const [res, setRes] = useState(null);
  const [cam, setCam] = useState(false);
  const [perm, askPerm] = useCameraPermissions();
  const lock = useRef(false);
  const up = mine().filter((r) => !isPast(r) || r.date === today());
  const log = db.log.filter((x) => x.uid === db.me).slice().reverse();

  const doScan = async (raw) => {
    try {
      const r = await scanCabinet(raw);
      setRes({ ok: r.ok, title: r.title, msg: r.msg });
      await refresh();
    } catch (x) { setRes({ ok: false, title: 'Error', msg: x.message }); }
  };
  const onCode = ({ data }) => {
    if (lock.current) return;
    lock.current = true; setCam(false); setV(data); doScan(data);
    setTimeout(() => { lock.current = false; }, 1500);
  };
  const openCam = async () => {
    if (!perm?.granted) { const p = await askPerm(); if (!p.granted) return setRes({ ok: false, title: 'Camera blocked', msg: 'Allow camera access to scan, or enter the ID manually.' }); }
    setRes(null); setCam(true);
  };

  return (
    <Layout cur="scan" title="Cabinet Scanner" subtitle="Scan your QR pass to unlock your slot.">
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 18, alignItems: 'flex-start' }}>
        <View style={{ flex: wide ? 1 : undefined, width: wide ? undefined : '100%' }}>
          <View style={s.card}>
            <Text style={s.cardTitle}>Scan your QR code</Text>
            <Text style={[s.cardSub, { marginBottom: 16 }]}>Use the camera, or enter a reservation ID to simulate the cabinet reader.</Text>
            {cam ? (
              <View style={{ height: 280, borderRadius: 16, overflow: 'hidden', marginBottom: 14, borderWidth: 2, borderColor: GOLD }}>
                <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={onCode} />
              </View>
            ) : null}
            <Btn full icon={cam ? 'close' : 'camera-outline'} label={cam ? 'Close camera' : 'Scan with camera'} onPress={() => (cam ? setCam(false) : openCam())} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 18 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: c.line }} /><Text style={{ color: c.muted, fontSize: 12.5, fontWeight: '600' }}>OR ENTER MANUALLY</Text><View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput style={[s.input, { flex: 1 }]} placeholder="Reservation ID or QR text" placeholderTextColor={c.muted} value={v} onChangeText={setV} autoCapitalize="none" onSubmitEditing={() => doScan(v)} />
              <Btn variant="soft" icon="scan-outline" label="Scan" onPress={() => doScan(v)} />
            </View>
            {up.length ? (
              <View style={[s.row, { marginTop: 12 }]}>
                {up.map((r) => <Btn key={r.id} small variant="outline" label={`#${r.id} · Slot ${r.slot}`} onPress={() => { setV(String(r.id)); doScan(r.id); }} />)}
              </View>
            ) : null}
            {res ? (
              <View style={{ marginTop: 20, padding: 20, borderRadius: 16, backgroundColor: res.ok ? c.okBg : c.badBg, alignItems: 'center', gap: 4 }}>
                <Ionicons name={res.ok ? 'checkmark-circle' : 'close-circle'} size={44} color={res.ok ? c.ok : c.bad} />
                <Text style={{ color: res.ok ? c.ok : c.bad, fontWeight: '800', fontSize: 17 }}>{res.title}</Text>
                <Text style={[s.muted, { textAlign: 'center', color: res.ok ? c.ok : c.bad }]}>{res.msg}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={{ flex: wide ? 1 : undefined, width: wide ? undefined : '100%' }}>
          <View style={s.card}><Text style={s.cardTitle}>Cabinet activity</Text><Text style={[s.cardSub, { marginBottom: 6 }]}>Your store and retrieve history.</Text><LogList list={log} /></View>
        </View>
      </View>
    </Layout>
  );
}

export default Scan;
