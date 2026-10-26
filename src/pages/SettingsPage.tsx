import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getSchoolDaysForMonth, setSchoolDay, resetSchoolDayToKPMDefault } from '../services/calendarService';
import { resolveSchoolDay, getKPMHoliday } from '../services/kpmCalendarEngine';
import { getMonthNameBM, getTodayMalaysianDate, isWeekend, getDayNameBM } from '../utils/dateUtils';
import { SchoolDay } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Calendar, Clock, Save, Plus, Loader2, Sparkles, RotateCcw, RefreshCw, CheckCircle2 } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);

  const [calendarMap, setCalendarMap] = useState<Map<string, SchoolDay>>(new Map());
  const [loading, setLoading] = useState(true);

  // Edit Day Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [isSchoolDay, setIsSchoolDay] = useState(true);
  const [dayType, setDayType] = useState<SchoolDay['dayType']>('REGULAR');
  const [notes, setNotes] = useState('');
  const [isSavingDay, setIsSavingDay] = useState(false);

  // Session Defaults Settings
  const [morningStart, setMorningStart] = useState('06:30');
  const [morningEnd, setMorningEnd] = useState('08:00');
  const [morningLate, setMorningLate] = useState('07:30');
  const [dismissalStart, setDismissalStart] = useState('12:30');
  const [dismissalEnd, setDismissalEnd] = useState('14:30');
  const [settingsSaved, setSettingsSaved] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const loadCalendar = async () => {
    setLoading(true);
    try {
      const map = await getSchoolDaysForMonth(selectedYear, selectedMonth);
      setCalendarMap(map);
    } catch (err) {
      console.error('Ralat takwim:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      await loadCalendar();
      setSyncFeedback(`Takwim rasmi KPM ${getMonthNameBM(selectedMonth)} ${selectedYear} berjaya disegerakkan.`);
      setTimeout(() => setSyncFeedback(null), 4000);
    } catch (err: any) {
      alert('Ralat semasa menyegerak takwim: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadCalendar();
  }, [selectedYear, selectedMonth]);

  const handleOpenDayModal = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    const existing = calendarMap.get(dateStr);
    const resolved = resolveSchoolDay(dateStr, existing);
    setIsSchoolDay(resolved.isSchoolDay);
    setDayType(resolved.dayType);
    setNotes(resolved.notes || '');
    setModalOpen(true);
  };

  const handleResetToKPM = async () => {
    if (!user) return;
    setIsSavingDay(true);
    try {
      await resetSchoolDayToKPMDefault(user.uid, user.email || '', selectedDateStr);
      setModalOpen(false);
      await loadCalendar();
    } catch (err: any) {
      alert('Ralat menetapkan semula takwim: ' + err.message);
    } finally {
      setIsSavingDay(false);
    }
  };

  const handleSaveDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingDay(true);
    try {
      await setSchoolDay(
        user.uid,
        user.email || '',
        selectedDateStr,
        isSchoolDay,
        dayType,
        notes
      );
      setModalOpen(false);
      await loadCalendar();
    } catch (err: any) {
      alert('Ralat menyimpan takwim: ' + err.message);
    } finally {
      setIsSavingDay(false);
    }
  };

  // Bina senarai hari dalam bulan yang dipilih
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const firstDayDate = new Date(selectedYear, selectedMonth - 1, 1);
  // Isnin = 0, Selasa = 1, ..., Sabtu = 5, Ahad = 6
  const leadingSpacers = (firstDayDate.getDay() + 6) % 7;

  const dayRows = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = String(d).padStart(2, '0');
    const mStr = String(selectedMonth).padStart(2, '0');
    const fullDate = `${selectedYear}-${mStr}-${dStr}`;
    const custom = calendarMap.get(fullDate);
    const resolved = resolveSchoolDay(fullDate, custom);
    const dayNameBM = getDayNameBM(fullDate);

    dayRows.push({
      dateStr: fullDate,
      dayNumber: d,
      dayNameBM,
      isSchoolDay: resolved.isSchoolDay,
      dayType: resolved.dayType,
      notes: resolved.notes || 'Hari Persekolahan Biasa',
      source: resolved.source,
      badgeColor: resolved.badgeColor,
      categoryLabel: resolved.categoryLabel,
      isManualOverride: !!custom
    });
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Tetapan Sistem & Takwim Persekolahan</h2>
        <p className="text-xs text-slate-500">
          Urus takwim hari persekolahan, cuti umum, ambang masa hadir lewat dan waktu sesi.
        </p>
      </div>

      {/* Tetapan Waktu Lalai Sesi */}
      <Card title="Waktu & Ambang Kehadiran Piawai" subtitle="Tetapan waktu lalai bagi sesi Pagi dan Pulang">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          
          {/* Sesi Pagi */}
          <div className="p-4 bg-blue-50/50 border border-blue-200/60 rounded-2xl space-y-3">
            <h4 className="font-bold text-blue-900 text-sm flex items-center space-x-1.5">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Sesi Pagi (Hadir Masuk)</span>
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Masa Mula</label>
                <input
                  type="time"
                  value={morningStart}
                  onChange={(e) => setMorningStart(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Masa Tamat</label>
                <input
                  type="time"
                  value={morningEnd}
                  onChange={(e) => setMorningEnd(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold text-xs mb-1">
                Ambang Hadir Lewat (Lewat selepas)
              </label>
              <input
                type="time"
                value={morningLate}
                onChange={(e) => setMorningLate(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-amber-700"
              />
              <p className="text-[11px] text-slate-500 mt-1">Imbasan selepas waktu ini akan ditandakan LEWAT.</p>
            </div>
          </div>

          {/* Sesi Pulang */}
          <div className="p-4 bg-indigo-50/50 border border-indigo-200/60 rounded-2xl space-y-3">
            <h4 className="font-bold text-indigo-900 text-sm flex items-center space-x-1.5">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Sesi Pulang (Waktu Balik)</span>
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Masa Mula</label>
                <input
                  type="time"
                  value={dismissalStart}
                  onChange={(e) => setDismissalStart(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Masa Tamat</label>
                <input
                  type="time"
                  value={dismissalEnd}
                  onChange={(e) => setDismissalEnd(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                />
              </div>
            </div>
          </div>

        </div>

        {isAdmin && (
          <div className="mt-4 flex items-center justify-end">
            <Button
              variant="primary"
              size="sm"
              icon={<Save className="w-3.5 h-3.5" />}
              onClick={() => {
                setSettingsSaved(true);
                setTimeout(() => setSettingsSaved(false), 3000);
              }}
            >
              {settingsSaved ? 'Disimpan!' : 'Simpan Tetapan Waktu'}
            </Button>
          </div>
        )}
      </Card>

      {/* Kalendar Persekolahan */}
      <Card 
        title="Takwim Hari Persekolahan & Cuti" 
        subtitle="Tetapkan hari cuti sekolah, cuti am atau penutupan khas"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800 shadow-xs"
            >
              {[2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800 shadow-xs"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                <option key={m} value={m}>{getMonthNameBM(m)}</option>
              ))}
            </select>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualSync}
                disabled={isSyncing}
                icon={isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" /> : <RefreshCw className="w-3.5 h-3.5 text-blue-600" />}
                className="text-xs bg-white text-blue-800 border-blue-200 hover:bg-blue-50 shadow-xs"
                title="Segerak dan Muat Semula Takwim Rasmi KPM bagi bulan/tahun ini"
              >
                {isSyncing ? 'Menyegerak...' : 'Segerak Manual (KPM)'}
              </Button>
            )}
          </div>
        }
      >
        {syncFeedback && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center space-x-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{syncFeedback}</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <div>
            {/* Banner Auto-Sync KPM */}
            <div className="mb-4 p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-blue-900">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>
                  <strong>Auto-Sync Rasmi KPM (Kumpulan B - Sabah):</strong> Cuti penggal KPM, cuti kelepasan am persekutuan & negeri Sabah diselaraskan secara automatik. Pindaan manual pentadbir sekolah mempunyai keutamaan tertinggi.
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300">Cuti Kebangsaan</span>
                <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-300">Cuti Sabah</span>
                <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-300">Cuti Penggal KPM</span>
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">Cuti Tambahan KPM</span>
                <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 border border-slate-300">Hujung Minggu</span>
                <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-900 border border-yellow-300">Pindaan Sekolah</span>
              </div>
            </div>

            <div className="overflow-x-auto pb-2">
              <div className="min-w-[700px]">
                {/* Baris Pengepala 7 Hari Seminggu (Isnin - Ahad) */}
                <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-black">
                  <div className="p-2 bg-blue-50/80 border border-blue-200/80 rounded-xl text-blue-900 tracking-wider">
                    ISNIN
                  </div>
                  <div className="p-2 bg-blue-50/80 border border-blue-200/80 rounded-xl text-blue-900 tracking-wider">
                    SELASA
                  </div>
                  <div className="p-2 bg-blue-50/80 border border-blue-200/80 rounded-xl text-blue-900 tracking-wider">
                    RABU
                  </div>
                  <div className="p-2 bg-blue-50/80 border border-blue-200/80 rounded-xl text-blue-900 tracking-wider">
                    KHAMIS
                  </div>
                  <div className="p-2 bg-blue-50/80 border border-blue-200/80 rounded-xl text-blue-900 tracking-wider">
                    JUMAAT
                  </div>
                  <div className="p-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 tracking-wider">
                    SABTU
                  </div>
                  <div className="p-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 tracking-wider">
                    AHAD
                  </div>
                </div>

                {/* Grid Hari Kalendar Mengikut Susunan Hari */}
                <div className="grid grid-cols-7 gap-2">
                  {/* Sel Kosong (Spacers) untuk Hari Pertama Bulan */}
                  {Array.from({ length: leadingSpacers }).map((_, sIdx) => (
                    <div 
                      key={`spacer-${sIdx}`} 
                      className="p-2.5 rounded-xl border border-dashed border-slate-200/60 bg-slate-50/30" 
                    />
                  ))}

                  {/* Kad Setiap Hari */}
                  {dayRows.map(day => {
                    // Pewarnaan Penuh Petak Mengikut Kategori Cuti
                    let cardBg = 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-xs';
                    let badgeBg = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                    let dayNumColor = 'text-slate-900';
                    let noteColor = 'text-slate-600 font-normal';

                    if (!day.isSchoolDay) {
                      if (day.badgeColor === 'red') {
                        cardBg = 'bg-rose-50 border-rose-300 hover:border-rose-400 hover:shadow-xs';
                        badgeBg = 'bg-rose-500 text-white border-rose-600 shadow-xs';
                        dayNumColor = 'text-rose-950 font-black';
                        noteColor = 'text-rose-900 font-semibold';
                      } else if (day.badgeColor === 'purple') {
                        cardBg = 'bg-purple-50 border-purple-300 hover:border-purple-400 hover:shadow-xs';
                        badgeBg = 'bg-purple-600 text-white border-purple-700 shadow-xs';
                        dayNumColor = 'text-purple-950 font-black';
                        noteColor = 'text-purple-900 font-semibold';
                      } else if (day.badgeColor === 'blue') {
                        cardBg = 'bg-sky-50 border-sky-300 hover:border-sky-400 hover:shadow-xs';
                        badgeBg = 'bg-sky-600 text-white border-sky-700 shadow-xs';
                        dayNumColor = 'text-sky-950 font-black';
                        noteColor = 'text-sky-900 font-semibold';
                      } else if (day.badgeColor === 'orange') {
                        cardBg = 'bg-amber-50 border-amber-300 hover:border-amber-400 hover:shadow-xs';
                        badgeBg = 'bg-amber-500 text-white border-amber-600 shadow-xs';
                        dayNumColor = 'text-amber-950 font-black';
                        noteColor = 'text-amber-900 font-semibold';
                      } else if (day.badgeColor === 'yellow') {
                        cardBg = 'bg-yellow-50 border-yellow-300 hover:border-yellow-400 hover:shadow-xs';
                        badgeBg = 'bg-yellow-400 text-yellow-950 border-yellow-500 shadow-xs';
                        dayNumColor = 'text-yellow-950 font-black';
                        noteColor = 'text-yellow-900 font-semibold';
                      } else {
                        cardBg = 'bg-slate-100/85 border-slate-200/90 hover:border-slate-300';
                        badgeBg = 'bg-slate-200 text-slate-700 border-slate-300';
                        dayNumColor = 'text-slate-600 font-bold';
                        noteColor = 'text-slate-500';
                      }
                    } else if (day.isManualOverride) {
                      cardBg = 'bg-emerald-50 border-emerald-300 hover:border-emerald-400 hover:shadow-xs';
                      badgeBg = 'bg-emerald-600 text-white border-emerald-700 shadow-xs';
                      dayNumColor = 'text-emerald-950 font-black';
                      noteColor = 'text-emerald-900 font-semibold';
                    }

                    return (
                      <div
                        key={day.dateStr}
                        onClick={() => isAdmin && handleOpenDayModal(day.dateStr)}
                        className={`p-2.5 rounded-xl border text-center transition-all ${cardBg} ${
                          isAdmin ? 'cursor-pointer' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-sm ${dayNumColor}`}>{day.dayNumber}</span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                            {day.dayNameBM}
                          </span>
                          {day.isManualOverride && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-yellow-200 text-yellow-900 border border-yellow-300 rounded" title="Pindaan Manual Pentadbir Sekolah">
                              Pindaan
                            </span>
                          )}
                        </div>
                        <span className={`inline-block px-1.5 py-0.5 rounded-md text-[10px] font-bold mt-1 border ${badgeBg}`}>
                          {day.isSchoolDay ? 'Sekolah' : 'Cuti'}
                        </span>
                        <p className={`text-[10px] mt-1 truncate ${noteColor}`} title={day.notes}>
                          {day.notes}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Modal Kemaskini Hari Kalendar */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={`Tetapan Takwim: ${getDayNameBM(selectedDateStr)}, ${selectedDateStr}`}
          maxWidth="sm"
        >
          <form onSubmit={handleSaveDay} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status Hari Persekolahan
              </label>
              <div className="flex items-center space-x-3 text-xs">
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="isSchoolDay"
                    checked={isSchoolDay}
                    onChange={() => {
                      setIsSchoolDay(true);
                      setDayType('REGULAR');
                    }}
                  />
                  <span>Hari Persekolahan</span>
                </label>
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="isSchoolDay"
                    checked={!isSchoolDay}
                    onChange={() => {
                      setIsSchoolDay(false);
                      setDayType('HOLIDAY');
                    }}
                  />
                  <span>Hari Cuti</span>
                </label>
              </div>
            </div>

            {!isSchoolDay && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jenis Cuti
                </label>
                <select
                  value={dayType}
                  onChange={(e) => setDayType(e.target.value as any)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200"
                >
                  <option value="HOLIDAY">Cuti Am / Cuti Sekolah</option>
                  <option value="SPECIAL">Penutupan Khas / Bencana</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Catatan
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Cuti Hari Kebangsaan / Peperiksaan Akhir Tahun"
                className="w-full text-xs p-2 rounded-xl border border-slate-200"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              {calendarMap.has(selectedDateStr) ? (
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={handleResetToKPM}
                  icon={<RotateCcw className="w-3.5 h-3.5 text-amber-600" />}
                  className="text-amber-800 border-amber-300 hover:bg-amber-50 text-xs"
                  title="Padam pindaan manual dan gunakan Takwim Asas KPM"
                >
                  Guna Takwim KPM
                </Button>
              ) : <div />}

              <div className="flex items-center space-x-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isSavingDay}>
                  Simpan Pindaan
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
};
