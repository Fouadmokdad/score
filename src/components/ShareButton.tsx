import { Share2 } from 'lucide-react';
import { shareElementAsImage } from '../utils/share';
import { useState } from 'react';

interface Props {
  targetId: string;
  fileName?: string;
  className?: string;
}

export function ShareButton({ targetId, fileName = 'score.png', className = '' }: Props) {
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    setLoading(true);
    await shareElementAsImage(targetId, fileName);
    setLoading(false);
  };

  return (
    <button
      onClick={handleShare}
      disabled={loading}
      className={`hide-on-share btn-secondary h-11 w-11 px-0 py-0 ${className} ${loading ? 'opacity-50' : ''}`}
      aria-label="Share score"
    >
      <Share2 className="h-5 w-5" />
    </button>
  );
}
