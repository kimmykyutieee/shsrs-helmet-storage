import { Alert, Share } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { WEB } from '../constants/theme';

const confirmBox = (title, msg, yesLabel, onYes) => {
  if (WEB) { if (window.confirm(`${title}\n\n${msg}`)) onYes(); return; }
  Alert.alert(title, msg, [{ text: 'No', style: 'cancel' }, { text: yesLabel, style: 'destructive', onPress: onYes }]);
};
const shareText = async (message, toast, title) => {
  if (WEB) {
    try {
      if (navigator.share) await navigator.share({ title, text: message });
      else { await navigator.clipboard.writeText(message); toast('Copied to clipboard.'); }
    } catch (e) { if (!e || e.name !== 'AbortError') toast('Sharing is not available.'); }
    return;
  }
  try { await Share.share({ title, message }); } catch (e) { toast('Sharing is not available.'); }
};
const sharePdf = async (html, toast) => {
  if (WEB) { await Print.printAsync({ html }); return; }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  else toast('Sharing is not available on this device.');
};

export { confirmBox, shareText, sharePdf };
