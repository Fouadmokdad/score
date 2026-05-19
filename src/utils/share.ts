import { toPng } from 'html-to-image';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

export async function shareElementAsImage(elementId: string, fileName: string = 'score.png') {
  try {
    const el = document.getElementById(elementId);
    if (!el) return false;

    const dataUrl = await toPng(el, { 
      quality: 0.95, 
      pixelRatio: 2,
      filter: (node) => {
        if (node.classList && node.classList.contains('hide-on-share')) return false;
        return true;
      }
    });

    if (Capacitor.isNativePlatform()) {
      const base64Data = dataUrl.split(',')[1];
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      await Share.share({
        title: 'Match Result',
        url: savedFile.uri,
      });
    } else {
      // Fallback for web
      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      link.click();
    }
    return true;
  } catch (error) {
    console.error('Error sharing image', error);
    return false;
  }
}
