import { createContext, useCallback, useContext, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  tone?: 'danger' | 'warning';
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...options, resolve });
    });
  }, []);

  const close = (value: boolean) => {
    state?.resolve(value);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[1.5rem] p-4 glass-modal">
            <div className="flex items-start gap-3">
              <div
                className={
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ' +
                  (state.tone === 'danger'
                    ? 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-300'
                    : 'bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300')
                }
              >
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-extrabold">{state.title}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-300">{state.message}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button className="btn-secondary" onClick={() => close(false)}>
                {state.cancelText}
              </button>
              <button
                className={state.tone === 'danger' ? 'btn-danger' : 'btn-primary'}
                onClick={() => close(true)}
              >
                {state.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm must be used inside ConfirmProvider');
  return confirm;
}
