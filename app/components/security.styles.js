import { StyleSheet } from 'react-native';

const staticStyles = StyleSheet.create({
  cabinetActivityText1: { marginBottom: 6 },
  securityScannerStatus: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 14, gap: 5 }
});

const dynamicStyles = {
  securityScannerStatus: ({ c, res }) => {
    const valid = res.ok || res.scanResult === 'VALID';
    return {
      backgroundColor: valid ? c.okBg : c.badBg,
      borderColor: valid ? c.ok : c.bad,
    };
  },
  securityScannerStatusTitle: ({ c, res }) => ({
    color: res.ok || res.scanResult === 'VALID' ? c.ok : c.bad,
    fontSize: 17,
    fontWeight: '800',
  }),
};

export { staticStyles, dynamicStyles };
