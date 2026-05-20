import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  /** Tailwind max-h class for the inner scroll area */
  maxHeight?: string;
  /** Render in a portal to escape stacking contexts (default true) */
  portal?: boolean;
}

/**
 * Mobile-first bottom sheet with drag-to-dismiss.
 * Falls back to a centered modal on >= sm screens.
 */
export function BottomSheet({ open, onClose, title, children, maxHeight = 'max-h-[80vh]', portal = true }: Props) {
  // Prevent background scroll while open
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y > 80 || info.velocity.y > 500) {
      onClose();
    }
  };

  const node = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end sm:items-center sm:justify-center sm:p-4">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className={
              'relative w-full max-w-md rounded-t-[2rem] border border-black/5 bg-[#F9F6EE] p-4 pb-8 shadow-2xl dark:border-white/5 dark:bg-[#1a1915] sm:rounded-[2rem] sm:pb-6 ' +
              maxHeight
            }
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={handleDragEnd}
          >
            {/* Drag handle */}
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-black/10 dark:bg-white/10" />

            {title && (
              <div className="mb-3 text-center">
                {typeof title === 'string' ? (
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h3>
                ) : (
                  title
                )}
              </div>
            )}

            <div className="overflow-y-auto pe-1" style={{ maxHeight: 'calc(80vh - 6rem)' }}>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (!portal || typeof document === 'undefined') return node;
  return createPortal(node, document.body);
}
