import { StyleSheet } from 'react-native';

const staticStyles = StyleSheet.create({
  profileText3: { marginBottom: 18 },
  profileView4: { flexDirection: 'row', alignItems: 'center', gap: 18, marginBottom: 20 },
  profileView5: { gap: 8 },
  profileText10: { marginBottom: 16 }
});

const dynamicStyles = {
  profileView1: ({ wide }) => ({ flexDirection: wide ? 'row' : 'column', gap: 18, alignItems: 'flex-start' }),
  profileView2: ({ wide }) => ({ flex: wide ? 1 : undefined, width: wide ? undefined : '100%' }),
  profileView8: ({ c }) => ({ borderColor: c.bad }),
  profileText9: ({ c }) => ({ color: c.bad })
};

export { staticStyles, dynamicStyles };
