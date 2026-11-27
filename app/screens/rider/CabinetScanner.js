import React, { useState, useRef } from 'react';
import { View, Text, TextInput, useWindowDimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../shared/hooks/useApp';
import { scanCabinet } from '../../services/cabinetService';
import { today, fd, ft, isPast } from '../../shared/utils/date';
import { GOLD } from '../../shared/constants/theme';
import { Layout, Btn, LogList } from '../../components';
import { staticStyles, dynamicStyles } from '../../components/rider.styles';
import { staticStyles as securityStaticStyles, dynamicStyles as securityDynamicStyles } from '../../components/security.styles';

function Scan() {
  const { db, refresh, mine, me, s, c, wide } = useApp();
  const { height: windowHeight } = useWindowDimensions();
  const [v, setV] = useState('');
  const [res, setRes] = useState(null);
  const [refreshWarning, setRefreshWarning] = useState('');
  const [cam, setCam] = useState(false);
  const [securityCameraFacing, setSecurityCameraFacing] = useState('back');
  const [perm, askPerm] = useCameraPermissions();
  const lock = useRef(false);
  const lastSecurityCode = useRef(null);
  const queuedSecurityCode = useRef(null);
  const up = me.security ? [] : mine().filter((r) => !isPast(r) || r.date === today());
  const log = me.security ? db.log.slice().reverse() : db.log.filter((x) => x.uid === db.me).slice().reverse();

  const doScan = async (raw) => {
    try {
      const r = await scanCabinet(raw);
      setRes(r);
      setRefreshWarning('');
      try { await refresh(); }
      catch (x) {
        if (!me.security) throw x;
        setRefreshWarning(x.message);
      }
    } catch (x) {
      setRes({ ok: false, scanResult: 'ERROR', title: me.security ? 'Scanner error' : 'Error', msg: x.message });
    }
  };
  const scanSecurityCode = (code) => {
    lock.current = true;
    lastSecurityCode.current = code;
    setV(code);
    doScan(code).finally(() => {
      lock.current = false;
      const nextCode = queuedSecurityCode.current;
      queuedSecurityCode.current = null;
      if (nextCode && nextCode !== lastSecurityCode.current) scanSecurityCode(nextCode);
    });
  };
  const onCode = ({ data }) => {
    const code = String(data || '').trim();
    if (!code) return;
    if (me.security) {
      if (lock.current) {
        if (lastSecurityCode.current !== code) queuedSecurityCode.current = code;
        return;
      }
      if (lastSecurityCode.current === code) return;
      scanSecurityCode(code);
      return;
    }
    if (lock.current) return;
    lock.current = true; setCam(false); setV(code); doScan(code);
    setTimeout(() => { lock.current = false; }, 1500);
  };
  const openCam = async () => {
    if (!perm?.granted) {
      const p = await askPerm();
      if (!p.granted) return setRes({
        ok: false,
        scanResult: 'ERROR',
        title: 'Camera blocked',
        msg: me.security ? 'Allow camera access to use the Security scanner.' : 'Allow camera access to scan, or enter the ID manually.',
      });
    }
    lastSecurityCode.current = null;
    queuedSecurityCode.current = null;
    setRes(null); setRefreshWarning(''); setCam(true);
  };
  const securityStatus = res?.scanResult === 'VALID' || res?.ok
    ? 'VALID QR CODE'
    : res?.scanResult === 'EXPIRED'
      ? 'EXPIRED QR CODE'
      : res?.scanResult === 'INVALID'
        ? 'INVALID QR CODE'
        : res?.scanResult === 'DENIED'
          ? 'ACCESS DENIED'
          : 'SCANNER ERROR';

  return (
    <Layout cur={me.security ? 'securityScan' : 'scan'} title={me.security ? 'Camera Scanner' : 'Locker Scanner'}>
      <View style={dynamicStyles.cabinetScannerView1({ wide })}>
        <View style={dynamicStyles.cabinetScannerView2({ wide })}>
          <View style={s.card}>
      
            {me.security ? (
              <>
                {res ? (
                  <View style={[securityStaticStyles.securityScannerStatus, securityDynamicStyles.securityScannerStatus({ c, res })]}>
                    <Text style={securityDynamicStyles.securityScannerStatusTitle({ c, res })}>{securityStatus}</Text>
                    {res.reservation ? (
                      <Text style={s.cardSub}>
                        Reservation #{res.reservation.id} · Locker {res.reservation.slot} · {fd(res.reservation.date)} · {ft(res.reservation.time)}{res.reservation.endTime ? `–${ft(res.reservation.endTime)}` : ''}
                      </Text>
                    ) : null}
                    {res.action ? <Text style={s.cardSub}>Action: {res.action}</Text> : null}
                    <Text style={s.muted}>{res.msg}</Text>
                    {refreshWarning ? <Text style={s.err}>Activity refresh failed: {refreshWarning}</Text> : null}
                    {cam ? (
                      <Btn small variant="outline" label="Scan this QR again" onPress={() => {
                        lastSecurityCode.current = null;
                        queuedSecurityCode.current = null;
                        setRes(null);
                      }} />
                    ) : null}
                  </View>
                ) : null}
                {cam ? (
                  <View style={[dynamicStyles.cabinetScannerView4({ GOLD }), { height: Math.min(560, Math.max(360, windowHeight * 0.55)) }]}>
                    <CameraView key={securityCameraFacing} style={staticStyles.cabinetScannerCameraView5} facing={securityCameraFacing} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={onCode} />
                  </View>
                ) : null}
                {cam ? (
                  <Btn full variant="outline" icon="camera-reverse-outline" label={`Use ${securityCameraFacing === 'back' ? 'front' : 'back'} camera`} onPress={() => setSecurityCameraFacing((facing) => facing === 'back' ? 'front' : 'back')} />
                ) : null}
                <Btn full icon={cam ? 'close' : 'camera-outline'} label={cam ? 'Close camera' : 'Scan with camera'} onPress={() => (cam ? setCam(false) : openCam())} />
              </>
            ) : (
              <>
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
                    {up.map((r) => <Btn key={r.id} small variant="outline" label={`#${r.id} · Locker ${r.slot}`} onPress={() => { setV(String(r.id)); doScan(r.id); }} />)}
                  </View>
                ) : null}
                {res ? (
                  <View style={dynamicStyles.cabinetScannerView13({ c, res })}>
                    <Ionicons name={res.ok ? 'checkmark-circle' : 'close-circle'} size={44} color={res.ok ? c.ok : c.bad} />
                    <Text style={dynamicStyles.cabinetScannerText14({ c, res })}>{res.title}</Text>
                    <Text style={[s.muted, dynamicStyles.cabinetScannerText15({ c, res })]}>{res.msg}</Text>
                  </View>
                ) : null}
              </>
            )}
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
