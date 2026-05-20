import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Optional decorative cards stacked behind the icon */
  decoration?: 'cards' | 'sparkle';
}

export function EmptyState({ icon: Icon, title, description, action, decoration = 'cards' }: Props) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative mb-5 flex h-28 w-28 items-center justify-center"
      >
        {decoration === 'cards' && (
          <>
            <div className="absolute inset-0 -rotate-12 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5" />
            <div className="absolute inset-0 rotate-6 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5" />
            <div className="absolute inset-0 rounded-2xl border border-slate-200 bg-white shadow-md dark:border-white/10 dark:bg-white/5" />
          </>
        )}
        {decoration === 'sparkle' && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-200/30 to-rose-200/30 blur-xl dark:from-amber-500/10 dark:to-rose-500/10" />
        )}
        <Icon
          className="relative h-12 w-12 text-slate-400 dark:text-slate-500"
          strokeWidth={1.5}
        />
      </motion.div>

      <motion.h3
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="text-lg font-extrabold text-slate-700 dark:text-slate-200"
      >
        {title}
      </motion.h3>

      {description && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mt-2 max-w-xs text-sm leading-relaxed text-slate-500 dark:text-slate-400"
        >
          {description}
        </motion.p>
      )}

      {action && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          onClick={action.onClick}
          className="btn-primary mt-5"
        >
          {action.label}
        </motion.button>
      )}
    </div>
  );
}
