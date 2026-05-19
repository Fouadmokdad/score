import { Share2 } from 'lucide-react';
import { shareElementAsImage } from '../utils/share';
import { useSettings } from '../store/settings';
import { copy } from '../i18n';
import { useState } from 'react';

interface Props {
  targetId: string;
  fileName?: string;
  className?: string;
}

export function ShareButton({ targetId, fileName = 'score.png', className = '' }: Props) {
  const { language } = useSettings();
  const t = copy[language];
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
      className={`hide-on-share btn-secondary gap-2 px-3 py-1.5 text-xs font-bold ${className} ${loading ? 'opacity-50' : ''}`}
    >
      <Share2 className="h-4 w-4" />
      {loading ? '...' : language === 'en' ? 'Share' : 'مشاركة'}
    </button>
  );
}
