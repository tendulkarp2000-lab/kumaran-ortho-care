import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

const BRANDING_HEADER = `
<div style="text-align:center; margin-bottom:20px; padding-bottom:14px; border-bottom:2px solid #1B3A6B;">
  <h2 style="margin:0; color:#1B3A6B; font-family:sans-serif; font-size:18px;">
    Kumaran Robotic Ortho Care
  </h2>
  <p style="margin:2px 0 0; color:#64748B; font-family:sans-serif; font-size:12px;">
    Dr. P.L. Vijayakumar, MS Ortho — Robotic Joint Replacement Specialist
  </p>
  <p style="margin:2px 0 0; color:#94A3B8; font-family:sans-serif; font-size:11px;">
    123 Srirangam Main Road, Trichy - 620006, Tamil Nadu | +91 431 234 5678
  </p>
</div>`;

const BRANDING_FOOTER = `
<div style="text-align:center; margin-top:24px; padding-top:12px; border-top:1px solid #E2E8F0;">
  <p style="color:#94A3B8; font-family:sans-serif; font-size:10px;">
    Kumaran Robotic Ortho Care — Your Health, Our Mission | உங்கள் ஆரோக்கியமே எங்கள் குறிக்கோள்
  </p>
</div>`;

export async function generateAndSharePdf(html: string, filename: string) {
  try {
    const { uri } = await Print.printToFileAsync({
      html: BRANDING_HEADER + html + BRANDING_FOOTER,
      width: 612,
      height: 792,
      base64: false,
    });
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: '.pdf',
      dialogTitle: filename,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    Alert.alert('பிழை / Error', `PDF உருவாக்க முடியவில்லை.\n${message}`);
  }
}
