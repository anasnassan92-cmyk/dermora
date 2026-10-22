import { Alert, Platform } from 'react-native';

/**
 * Small dialogs that work on every platform. react-native-web ships Alert as a no-op,
 * so on the web app we fall back to the browser's own alert()/confirm().
 */
export function showMessage(title: string, message: string, onOk?: () => void): void {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    onOk?.();
    return;
  }
  Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
}

/** Resolves true when the user confirms, false when they cancel. */
export function confirmAction(title: string, message: string, confirmLabel = 'OK'): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Avbryt', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
