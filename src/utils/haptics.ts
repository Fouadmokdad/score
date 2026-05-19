import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export const playHaptic = async (style: ImpactStyle = ImpactStyle.Light) => {
  if (Capacitor.isNativePlatform()) {
    try {
      await Haptics.impact({ style });
    } catch (e) {
      // Ignore if not supported
    }
  }
};

export const playVibration = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      await Haptics.vibrate();
    } catch (e) {
      // Ignore if not supported
    }
  }
};
