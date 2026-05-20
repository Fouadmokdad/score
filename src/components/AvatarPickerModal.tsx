import { useState } from 'react';
import { X, Plus, Image as ImageIcon, Paintbrush } from 'lucide-react';
import { useSavedPlayers, COLORS, AVATARS } from '../store/players';
import { useSettings } from '../store/settings';

// Premium Card-Themed and Game Emojis
const PREMIUM_EMOJIS = [
  '🃏', '👑', '👸', '👦', '♣️', '♥️', '♠️', '♦️',
  '🎲', '🏆', '🎯', '🎮', '🧙', '🌟', '🔥', '⚡',
  '😎', '😈', '🦁', '🦅', '🦄', '🍿', '🍕', '💵'
];

interface Props {
  playerName: string;
  onClose: () => void;
}

export function AvatarPickerModal({ playerName, onClose }: Props) {
  const { language } = useSettings();
  const en = language === 'en';
  const { players, updatePlayer, addPlayer } = useSavedPlayers();

  // Find player details or create temp player
  const player = players.find((p) => p.name.toLowerCase() === playerName.trim().toLowerCase()) ?? {
    name: playerName,
    avatar: `/jawaker-assets/avatars/adam.png`,
    color: COLORS[0],
  };

  const [currentAvatar, setCurrentAvatar] = useState(player.avatar);
  const [currentColor, setCurrentColor] = useState(player.color);
  const [activeTab, setActiveTab] = useState<'cards' | 'jawaker' | 'custom'>('cards');

  const handleSave = () => {
    // Ensure player is registered first
    const exists = players.some((p) => p.name.toLowerCase() === playerName.trim().toLowerCase());
    if (!exists) {
      addPlayer(playerName);
    }
    updatePlayer(playerName, {
      avatar: currentAvatar,
      color: currentColor,
    });
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 150;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setCurrentAvatar(dataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Backdrop with frosted blur */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-200" onClick={onClose} />
      
      {/* Modal Card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] p-5 shadow-2xl animate-in zoom-in-95 duration-200 glass-modal flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white">
              {en ? 'Customize Player' : 'تخصيص اللاعب'}
            </h3>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">{playerName}</p>
          </div>
          <button
            className="rounded-full bg-black/5 dark:bg-white/5 p-2 text-slate-500 hover:bg-black/10 dark:hover:bg-white/10 transition"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Live Preview Block */}
        <div className="mb-5 flex flex-col items-center justify-center p-4 rounded-3xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 relative overflow-hidden">
          <div className="absolute top-2 right-2 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-white/40 dark:bg-black/40 px-2 py-0.5 rounded-full">
            {en ? 'Live Preview' : 'معاينة مباشرة'}
          </div>
          
          <div
            className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br ${currentColor} text-4xl font-black text-white shadow-xl ring-4 ring-white dark:ring-slate-800`}
          >
            {currentAvatar.startsWith('/') || currentAvatar.startsWith('data:image/') ? (
              <img src={currentAvatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <span>{currentAvatar}</span>
            )}
          </div>
          <span className="mt-2.5 font-bold text-sm text-slate-800 dark:text-white">{playerName}</span>
        </div>

        {/* Category Tabs */}
        <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-black/5 dark:bg-white/5 p-1">
          {[
            { id: 'cards', label: en ? 'Premium' : 'مميز' },
            { id: 'jawaker', label: en ? 'Characters' : 'شخصيات' },
            { id: 'custom', label: en ? 'Photo' : 'صورة' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`rounded-lg py-1.5 text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow dark:bg-slate-800 dark:text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scroller Area */}
        <div className="flex-1 overflow-y-auto pr-1 pb-2 space-y-4">
          
          {/* Tab Content 1: Cards & Emojis */}
          {activeTab === 'cards' && (
            <div className="grid grid-cols-6 gap-2">
              {PREMIUM_EMOJIS.map((emoji) => {
                const isSelected = currentAvatar === emoji;
                return (
                  <button
                    key={emoji}
                    onClick={() => setCurrentAvatar(emoji)}
                    className={`aspect-square flex items-center justify-center text-2xl rounded-2xl transition hover:scale-105 active:scale-95 ${
                      isSelected
                        ? 'bg-white/20 ring-4 ring-[rgb(var(--accent))] dark:ring-[rgb(var(--accent-dark))]'
                        : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'
                    }`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          )}

          {/* Tab Content 2: Jawaker avatars */}
          {activeTab === 'jawaker' && (
            <div className="grid grid-cols-4 gap-2">
              {AVATARS.map((avatar) => {
                const path = `/jawaker-assets/avatars/${avatar}`;
                const isSelected = currentAvatar === path;
                return (
                  <button
                    key={avatar}
                    onClick={() => setCurrentAvatar(path)}
                    className={`aspect-square overflow-hidden rounded-2xl relative transition hover:scale-105 active:scale-95 border-2 ${
                      isSelected
                        ? 'border-[rgb(var(--accent))] ring-4 ring-[rgba(var(--accent),0.3)]'
                        : 'border-transparent bg-black/5 dark:bg-white/5'
                    }`}
                  >
                    <img src={path} alt="" className="h-full w-full object-cover" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Tab Content 3: Personal Photo Upload */}
          {activeTab === 'custom' && (
            <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-black/10 dark:border-white/10 rounded-2xl">
              <label className="flex flex-col items-center gap-2 cursor-pointer group">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(var(--accent),0.1)] text-[rgb(var(--accent))] group-hover:scale-110 transition">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {en ? 'Upload Image' : 'رفع صورة من الجهاز'}
                </div>
                <div className="text-[10px] text-slate-400">
                  {en ? 'Supports JPEG, PNG' : 'يدعم صور الجي بي جي والبنغ'}
                </div>
              </label>
            </div>
          )}

          {/* Background Gradients Swatches Selector */}
          <div className="border-t border-black/5 dark:border-white/5 pt-4">
            <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
              <Paintbrush className="h-3.5 w-3.5" />
              {en ? 'Card Background Swatch' : 'لون خلفية البطاقة'}
            </h4>
            <div className="grid grid-cols-4 gap-2">
              {COLORS.map((gradient) => {
                const isSelected = currentColor === gradient;
                return (
                  <button
                    key={gradient}
                    onClick={() => setCurrentColor(gradient)}
                    className={`h-9 w-full rounded-xl bg-gradient-to-br ${gradient} relative transition hover:scale-105 active:scale-95 border-2 ${
                      isSelected ? 'border-white dark:border-slate-800 ring-2 ring-[rgb(var(--accent))]' : 'border-transparent'
                    }`}
                    aria-label="Gradient swatch"
                  />
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="mt-4 flex gap-2 border-t border-black/5 dark:border-white/5 pt-4">
          <button
            onClick={handleSave}
            className="btn-primary flex-1 py-3 text-sm font-bold"
          >
            {en ? 'Apply Customization' : 'تطبيق التخصيص'}
          </button>
          <button
            onClick={onClose}
            className="btn-secondary py-3 text-sm font-bold"
          >
            {en ? 'Cancel' : 'إلغاء'}
          </button>
        </div>
      </div>
    </div>
  );
}
