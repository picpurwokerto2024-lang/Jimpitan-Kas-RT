import React from 'react';
import { 
  X, 
  Palette, 
  Sparkles, 
  Check, 
  Shuffle, 
  Info,
  Smartphone
} from 'lucide-react';
import { 
  AppTheme, 
  AVAILABLE_THEMES, 
  THEME_STORAGE_KEYS, 
  updateMetaThemeColor 
} from '../utils/themeManager';

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: AppTheme;
  isAutoRotate: boolean;
  onSelectTheme: (theme: AppTheme, isAuto: boolean) => void;
}

export const ThemeModal: React.FC<ThemeModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  isAutoRotate,
  onSelectTheme,
}) => {
  if (!isOpen) return null;

  const handleToggleAutoRotate = () => {
    const newAuto = !isAutoRotate;
    if (newAuto) {
      localStorage.setItem(THEME_STORAGE_KEYS.MODE, 'auto');
      onSelectTheme(currentTheme, true);
    } else {
      localStorage.setItem(THEME_STORAGE_KEYS.MODE, currentTheme.id);
      onSelectTheme(currentTheme, false);
    }
  };

  const handleChooseSpecificTheme = (theme: AppTheme) => {
    localStorage.setItem(THEME_STORAGE_KEYS.MODE, theme.id);
    updateMetaThemeColor(theme.themeColorMeta);
    onSelectTheme(theme, false);
  };

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-md w-full p-4 sm:p-5 space-y-4 my-auto max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
        id="theme-modal-container"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-2 border-b border-stone-200 pb-3">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-purple-100 text-purple-900 border border-purple-200 font-extrabold text-[11px] uppercase tracking-wider">
                <Palette className="w-3.5 h-3.5" />
                <span>PILIHAN TEMA APLIKASI</span>
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-stone-900 tracking-tight font-sans">
              Kustomisasi Warna & Suasana
            </h2>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl border border-stone-200 hover:border-stone-300 flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer flex-shrink-0"
            id="btn-close-theme-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auto-Rotation Toggle Card */}
        <div className={`p-3.5 rounded-2xl border transition-all ${
          isAutoRotate
            ? 'bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-emerald-500/10 border-amber-300 shadow-xs'
            : 'bg-stone-50 border-stone-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isAutoRotate ? 'bg-amber-500 text-white shadow-xs' : 'bg-stone-200 text-stone-600'
              }`}>
                <Shuffle className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-stone-900">
                  Ganti Otomatis Setiap Buka
                </h4>
                <p className="text-[11px] text-stone-500">
                  Tema berganti dinamis setiap kali membuka aplikasi di HP
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleAutoRotate}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs ${
                isAutoRotate
                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                  : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
              }`}
              id="btn-toggle-auto-theme"
            >
              {isAutoRotate ? 'AKTIF' : 'NONAKTIF'}
            </button>
          </div>
        </div>

        {/* List of Available Themes */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-stone-600 px-1">
            <span>PILIH TEMA TAMPILAN:</span>
            {isAutoRotate && (
              <span className="text-[11px] text-amber-700 font-extrabold flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Rotasi Otomatis Aktif</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {AVAILABLE_THEMES.map((theme) => {
              const isSelected = currentTheme.id === theme.id;

              return (
                <div
                  key={theme.id}
                  onClick={() => handleChooseSpecificTheme(theme)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                    isSelected
                      ? 'border-purple-600 bg-purple-50/40 shadow-xs ring-1 ring-purple-500'
                      : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/60'
                  }`}
                  id={`theme-card-${theme.id}`}
                >
                  <div className="flex items-center space-x-3">
                    {/* Visual Color Pill preview */}
                    <div className="w-10 h-10 rounded-xl overflow-hidden shadow-xs border border-black/10 flex-shrink-0 flex flex-col">
                      <div className={`h-2/3 ${theme.colorSwatch}`} />
                      <div className="h-1/3 bg-amber-400" />
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <h5 className="font-extrabold text-stone-900 text-xs sm:text-sm group-hover:text-purple-900">
                          {theme.name}
                        </h5>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-full bg-purple-700 text-white text-[10px] font-black">
                            AKTIF
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500">
                        {theme.tagline}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {isSelected ? (
                      <div className="w-7 h-7 rounded-full bg-purple-700 text-white flex items-center justify-center shadow-xs">
                        <Check className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full border border-stone-300 group-hover:border-purple-400 flex items-center justify-center text-transparent group-hover:text-purple-400 text-xs">
                        •
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info Box */}
        <div className="p-3 rounded-2xl bg-stone-100 border border-stone-200 text-stone-600 text-[11px] flex items-start space-x-2">
          <Info className="w-4 h-4 text-purple-700 flex-shrink-0 mt-0.5" />
          <p>
            Saat <strong>"Ganti Otomatis Setiap Buka"</strong> diaktifkan, warna tampilan header, status bar HP, dan aksen aplikasi akan otomatis berganti ke suasana baru setiap kali aplikasi dibuka.
          </p>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-stone-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-extrabold transition-colors cursor-pointer shadow-xs"
          >
            Tutup & Terapkan
          </button>
        </div>

      </div>
    </div>
  );
};
