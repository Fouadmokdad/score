import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { useRef, type ReactNode } from 'react';
import { Trash2, Pencil } from 'lucide-react';

interface Props {
  children: ReactNode;
  onDelete?: () => void;
  onEdit?: () => void;
  className?: string;
}

const ACTION_THRESHOLD = 80;

/**
 * Row that reveals action buttons when swiped horizontally.
 * - Swipe LEFT  → reveal delete (right side)
 * - Swipe RIGHT → reveal edit (left side)
 *
 * The component listens to RTL via the document direction so swipe semantics
 * stay consistent in Arabic (visually mirrored).
 */
export function SwipeableRow({ children, onDelete, onEdit, className = '' }: Props) {
  const x = useMotionValue(0);
  const ref = useRef<HTMLDivElement>(null);

  const deleteOpacity = useTransform(x, [-ACTION_THRESHOLD, 0], [1, 0]);
  const editOpacity = useTransform(x, [0, ACTION_THRESHOLD], [0, 1]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if ((offset < -ACTION_THRESHOLD || velocity < -500) && onDelete) {
      // Animate fully out then trigger
      x.set(-300);
      setTimeout(() => {
        onDelete();
        x.set(0);
      }, 150);
      return;
    }

    if ((offset > ACTION_THRESHOLD || velocity > 500) && onEdit) {
      onEdit();
    }
    x.set(0);
  };

  return (
    <div ref={ref} className={'relative overflow-hidden swipe-row ' + className}>
      {/* Right side: Delete (visible on swipe LEFT) */}
      {onDelete && (
        <motion.div
          style={{ opacity: deleteOpacity }}
          className="absolute inset-y-0 right-0 flex items-center justify-end bg-gradient-to-l from-red-500 to-red-500/80 px-6 text-white"
        >
          <Trash2 className="h-6 w-6" />
        </motion.div>
      )}

      {/* Left side: Edit (visible on swipe RIGHT) */}
      {onEdit && (
        <motion.div
          style={{ opacity: editOpacity }}
          className="absolute inset-y-0 left-0 flex items-center justify-start bg-gradient-to-r from-emerald-500 to-emerald-500/80 px-6 text-white"
        >
          <Pencil className="h-6 w-6" />
        </motion.div>
      )}

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.5}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative bg-white dark:bg-[#1a1915]"
      >
        {children}
      </motion.div>
    </div>
  );
}
