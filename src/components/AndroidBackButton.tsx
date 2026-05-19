import { useEffect, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useLocation, useNavigate } from 'react-router-dom';
import { useConfirm } from './ConfirmDialog';

export function AndroidBackButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const confirm = useConfirm();
  const locationKeyStack = useRef<string[]>([location.key]);
  const locationRef = useRef(location);

  useEffect(() => {
    locationRef.current = location;
    const stack = locationKeyStack.current;
    const existingIndex = stack.indexOf(location.key);
    if (existingIndex === -1) {
      stack.push(location.key);
    } else {
      stack.splice(existingIndex + 1);
    }
  }, [location]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const removeListener = CapacitorApp.addListener('backButton', async ({ canGoBack }) => {
      const stack = locationKeyStack.current;
      const currentPath = locationRef.current.pathname;
      const canNavigateBack = canGoBack && stack.length > 1 && currentPath !== '/';

      if (canNavigateBack) {
        stack.pop();
        navigate(-1);
        return;
      }

      const en = document.documentElement.lang === 'en';
      const ok = await confirm({
        title: en ? 'Exit app' : 'إغلاق التطبيق',
        message: en ? 'Are you sure you want to close Score?' : 'هل أنت متأكد أنك تريد إغلاق التطبيق؟',
        confirmText: en ? 'Exit' : 'إغلاق',
        cancelText: en ? 'Cancel' : 'إلغاء',
        tone: 'danger',
      });
      if (ok) {
        CapacitorApp.exitApp();
      }
    });

    return () => {
      removeListener.then((listener) => listener.remove());
    };
  }, [confirm, navigate]);

  return null;
}
