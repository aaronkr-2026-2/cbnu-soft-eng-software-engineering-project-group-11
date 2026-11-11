import { Linking } from 'react-native';

/** Try the ChatGPT app's URL scheme first; openURL rejects when no app handles it, so fall back to the website. */
export async function openChatGPT() {
  try { await Linking.openURL('chatgpt://'); }
  catch { await Linking.openURL('https://chatgpt.com/').catch(() => {}); }
}
