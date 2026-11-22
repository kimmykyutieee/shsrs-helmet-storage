import React, { useState, useRef } from 'react';
import { View, Text, TextInput } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../shared/hooks/useApp';
import { scanCabinet } from '../../services/cabinetService';
import { today, isPast } from '../../shared/utils/date';
import { GOLD } from '../../shared/constants/theme';
import { Layout, Btn, LogList } from '../../components';
import { staticStyles, dynamicStyles } from '../../components/rider.styles';

function Scan() {
  const { db, refresh, mine, me, s, c, wide } = useApp();
  const [v, setV] = useState('');
  const [res, setRes] = useState(null);
  const [cam, setCam] = useState(false);
  const [perm, askPerm] = useCameraPermissions();
  const lock = useRef(false);
  const up = me.security ? [] : mine().filter((r) => !isPast(r) || r.date === today());
  const log = me.security ? db.log.slice().reverse() : db.log.filter((x) => x.uid === db.me).slice().reverse();

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
    <Layout cur={me.security ? 'securityScan' : 'scan'} title={me.security ? 'Camera Scanner' : 'Cabinet Scanner'} subtitle={me.security ? 'Verify a rider reservation QR code at the cabinet.' : 'Scan your QR pass to unlock your slot.'}>
      <View style={dynamicStyles.cabinetScannerView1({ wide })}>
        <View style={dynamicStyles.cabinetScannerView2({ wide })}>
          <View style={s.card}>
            <Text style={s.cardTitle}>{me.security ? 'Scan a rider QR code' : 'Scan your QR code'}</Text>
            <Text style={[s.cardSub, staticStyles.cabinetScannerText3]}>{me.security ? 'Verify the reservation before assisting with helmet storage or retrieval.' : 'Use the camera, or enter a reservation ID to simulate the cabinet reader.'}</Text>
            {cam ? (
              <View style={dynamicStyles.cabinetScannerView4({ GOLD })}>
                <CameraView style={staticStyles.cabinetScannerCameraView5} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={onCode} />
              </View>
            ) : null}
            <Btn full icon={cam ? 'close' : 'camera-outline'} label={cam ? 'Close camera' : 'Scan with camera'} onPress={() => (cam ? setCam(false) : openCam())} />
            <View style={staticStyles.cabinetScannerView6}>
              <View style={dynamicStyles.cabinetScannerView7({ c })} /><Text style={dynamicStyles.cabinetScannerText8({ c })}>OR ENTER MANUALLY</Text><View style={dynamicStyles.cabinetScannerView7({ c })} />
            </View>
            <View style={staticStyles.cabinetScannerView10}>
              <TextInput style={[s.input, staticStyles.cabinetScannerCameraView5]} placeholder="Reservation ID or QR text" placeholderTextColor={c.muted} value={v} onChangeText={setV} autoCapitalize="none" onSubmitEditing={() => doScan(v)} />
              <Btn variant="soft" icon="scan-outline" label="Scan" onPress={() => doScan(v)} />
            </View>
            {up.length ? (
              <View style={[s.row, staticStyles.cabinetScannerView12]}>
                {up.map((r) => <Btn key={r.id} small variant="outline" label={`#${r.id} · Slot ${r.slot}`} onPress={() => { setV(String(r.id)); doScan(r.id); }} />)}
              </View>
            ) : null}
            {res ? (
              <View style={dynamicStyles.cabinetScannerView13({ c, res })}>
                <Ionicons name={res.ok ? 'checkmark-circle' : 'close-circle'} size={44} color={res.ok ? c.ok : c.bad} />
                <Text style={dynamicStyles.cabinetScannerText14({ c, res })}>{res.title}</Text>
                <Text style={[s.muted, dynamicStyles.cabinetScannerText15({ c, res })]}>{res.msg}</Text>
              </View>
            ) : null}
          </View>
        </View>
        {!me.security ? (
          <View style={dynamicStyles.cabinetScannerView2({ wide })}>

          </View>
        ) : null}
      </View>
    </Layout>
  );
}

export default Scan;
