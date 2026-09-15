import React, { useState } from 'react';
import { 
  Shield, 
  X, 
  Calendar, 
  User, 
  Phone, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  Users 
} from 'lucide-react';
import { ReguRonda, AppSettings } from '../types';

interface JadwalRondaModalProps {
  isOpen: boolean;
  onClose: () => void;
  reguList: ReguRonda[];
  activeReguId: string;
  onSelectRegu: (reguId: string) => void;
  settings: AppSettings;
  isAdmin?: boolean;
  onUpdateReguList?: (newReguList: ReguRonda[]) => void;
}

export const JadwalRondaModal: React.FC<JadwalRondaModalProps> = ({
  isOpen,
  onClose,
  reguList,
  activeReguId,
  onSelectRegu,
  settings,
  isAdmin = true,
  onUpdateReguList,
}) => {
  const [editingRegu, setEditingRegu] = useState<ReguRonda | null>(null);
  const [isAddMode, setIsAddMode] = useState<boolean>(false);

  // Form states
  const [namaRegu, setNamaRegu] = useState<string>('');
  const [hariRegu, setHariRegu] = useState<string>('Senin');
  const [koordinatorRegu, setKoordinatorRegu] = useState<string>('');
  const [anggotaStr, setAnggotaStr] = useState<string>('');

  if (!isOpen) return null;

  const openAddRegu = () => {
    setEditingRegu(null);
    setIsAddMode(true);
    setNamaRegu(`Regu ${reguList.length + 1}`);
    setHariRegu('Senin');
    setKoordinatorRegu('');
    setAnggotaStr('');
  };

  const openEditRegu = (regu: ReguRonda) => {
    setEditingRegu(regu);
    setIsAddMode(false);
    setNamaRegu(regu.nama);
    setHariRegu(regu.hari);
    setKoordinatorRegu(regu.koordinator);
    setAnggotaStr(regu.anggota.join(', '));
  };

  const handleSaveRegu = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaRegu.trim() || !koordinatorRegu.trim()) {
      alert('Mohon isi nama regu dan koordinator.');
      return;
    }

    const anggotaArr = anggotaStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (!onUpdateReguList) return;

    if (isAddMode) {
      const newRegu: ReguRonda = {
        id: `regu_${Date.now()}`,
        nama: namaRegu.trim(),
        hari: hariRegu,
        koordinator: koordinatorRegu.trim(),
        anggota: anggotaArr.length > 0 ? anggotaArr : [koordinatorRegu.trim()],
      };
      onUpdateReguList([...reguList, newRegu]);
    } else if (editingRegu) {
      const updatedList = reguList.map((r) =>
        r.id === editingRegu.id
          ? {
              ...r,
              nama: namaRegu.trim(),
              hari: hariRegu,
              koordinator: koordinatorRegu.trim(),
              anggota: anggotaArr.length > 0 ? anggotaArr : [koordinatorRegu.trim()],
            }
          : r
      );
      onUpdateReguList(updatedList);
    }

    setEditingRegu(null);
    setIsAddMode(false);
  };

  const handleDeleteRegu = (reguId: string, nama: string) => {
    if (reguList.length <= 1) {
      alert('Minimal harus ada 1 regu ronda yang terdaftar.');
      return;
    }
    if (window.confirm(`Hapus regu ronda "${nama}"?`)) {
      if (onUpdateReguList) {
        onUpdateReguList(reguList.filter((r) => r.id !== reguId));
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-lg w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-stone-900 text-base">
                Jadwal Ronda Malam
              </h3>
              <p className="text-xs text-stone-500">
                Susunan Regu Piket Siskamling {settings.namaRt} / {settings.namaRw}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isAdmin && !isAddMode && !editingRegu && (
              <button
                onClick={openAddRegu}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1 shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Regu</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl border border-stone-200 flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* FORM: ADD OR EDIT REGU */}
        {(isAddMode || editingRegu) && (
          <form onSubmit={handleSaveRegu} className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <h4 className="text-xs font-extrabold text-stone-800">
                {isAddMode ? 'Tambah Regu Ronda Baru' : `Edit ${editingRegu?.nama}`}
              </h4>
              <button
                type="button"
                onClick={() => {
                  setIsAddMode(false);
                  setEditingRegu(null);
                }}
                className="text-stone-400 hover:text-stone-700 text-xs"
              >
                Batal
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Nama Regu *
                </label>
                <input
                  type="text"
                  required
                  value={namaRegu}
                  onChange={(e) => setNamaRegu(e.target.value)}
                  placeholder="Misal: Regu 1 (Senin)"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 text-xs font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Hari Piket *
                </label>
                <select
                  value={hariRegu}
                  onChange={(e) => setHariRegu(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 text-xs font-bold outline-none"
                >
                  <option value="Senin">Senin Malam</option>
                  <option value="Selasa">Selasa Malam</option>
                  <option value="Rabu">Rabu Malam</option>
                  <option value="Kamis">Kamis Malam</option>
                  <option value="Jumat">Jumat Malam</option>
                  <option value="Sabtu">Sabtu Malam</option>
                  <option value="Minggu">Minggu Malam</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                Nama Koordinator *
              </label>
              <input
                type="text"
                required
                value={koordinatorRegu}
                onChange={(e) => setKoordinatorRegu(e.target.value)}
                placeholder="Misal: Pak Budi"
                className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 text-xs font-bold outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Daftar Nama Anggota (Pisahkan dengan koma)
              </label>
              <textarea
                rows={2}
                value={anggotaStr}
                onChange={(e) => setAnggotaStr(e.target.value)}
                placeholder="Misal: Pak Joko, Mas Doni, Pak Agus, Pak Santoso"
                className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 text-xs outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition-colors cursor-pointer"
            >
              Simpan Regu Ronda
            </button>
          </form>
        )}

        {/* Schedule List */}
        <div className="space-y-3">
          {reguList.map((regu, index) => {
            const isActive = regu.id === activeReguId;

            return (
              <div
                key={regu.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isActive
                    ? 'bg-emerald-50/70 border-emerald-400 shadow-xs ring-1 ring-emerald-300'
                    : 'bg-stone-50/70 border-stone-200/80 hover:border-emerald-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isActive
                          ? 'bg-emerald-600 text-white'
                          : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-stone-900 text-xs sm:text-sm">
                        {regu.nama}
                      </h4>
                      <div className="flex items-center space-x-1 text-[11px] text-stone-500">
                        <Clock className="w-3 h-3 text-stone-400" />
                        <span>Pukul 22.00 - 04.00 WIB</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {isActive ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>TUGAS MALAM INI</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => onSelectRegu(regu.id)}
                        className="px-2.5 py-1 rounded-xl bg-white border border-stone-200 text-stone-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                      >
                        Pilih Regu Ini
                      </button>
                    )}

                    {isAdmin && (
                      <div className="flex items-center space-x-1 pl-1 border-l border-stone-200">
                        <button
                          onClick={() => openEditRegu(regu)}
                          className="p-1 text-stone-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                          title="Edit Regu Ronda"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRegu(regu.id, regu.nama)}
                          className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Hapus Regu Ronda"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-200/60 space-y-1.5">
                  <div className="text-xs">
                    <span className="text-stone-500 font-medium">Koordinator: </span>
                    <span className="font-bold text-stone-800">{regu.koordinator}</span>
                  </div>

                  <div>
                    <span className="text-[11px] text-stone-400 block mb-1">
                      Anggota Regu ({regu.anggota.length} orang):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {regu.anggota.map((nama, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-lg bg-white border border-stone-200 text-[11px] font-semibold text-stone-700"
                        >
                          {nama}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 text-[11px] text-sky-800 space-y-1">
          <p className="font-bold">Ketentuan Ronda Siskamling:</p>
          <p>
            1. Petugas wajib hadir tepat waktu dan membawa senter / tongkat ronda.
            <br />
            2. Melakukan keliling jimpitan dan pengecekan keamanan lingkungan setiap 2 jam.
          </p>
        </div>
      </div>
    </div>
  );
};
