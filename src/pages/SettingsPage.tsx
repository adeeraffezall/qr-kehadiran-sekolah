import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getSchoolDaysForMonth, setSchoolDay } from '../services/calendarService';
import { getMonthNameBM, getTodayMalaysianDate, isWeekend } from '../utils/dateUtils';
import { SchoolDay } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Calendar, Clock, Save, Plus, Loader2 } from 'lucide-react';

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

  useEffect(() => {
    loadCalendar();
  }, [selectedYear, selectedMonth]);

  const handleOpenDayModal = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    const existing = calendarMap.get(dateStr);
    if (existing) {
      setIsSchoolDay(existing.isSchoolDay);
      setDayType(existing.dayType);
      setNotes(existing.notes || '');
    } else {
      const weekend = isWeekend(dateStr);
      setIsSchoolDay(!weekend);
      setDayType(weekend ? 'HOLIDAY' : 'REGULAR');
      setNotes(weekend ? 'Hujung Minggu' : 'Hari Persekolahan');
    }
    setModalOpen(true);
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
  const dayRows = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = String(d).padStart(2, '0');
    const mStr = String(selectedMonth).padStart(2, '0');
    const fullDate = `${selectedYear}-${mStr}-${dStr}`;
    const custom = calendarMap.get(fullDate);
    const weekend = isWeekend(fullDate);

    dayRows.push({
      dateStr: fullDate,
      dayNumber: d,
      isSchoolDay: custom ? custom.isSchoolDay : !weekend,
      dayType: custom ? custom.dayType : (weekend ? 'HOLIDAY' : 'REGULAR'),
      notes: custom ? custom.notes : (weekend ? 'Hujung Minggu' : 'Hari Biasa')
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
          <div className="flex items-center space-x-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
            >
              {[2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                <option key={m} value={m}>{getMonthNameBM(m)}</option>
              ))}
            </select>
          </div>
        }
      >
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {dayRows.map(day => (
              <div
                key={day.dateStr}
                onClick={() => isAdmin && handleOpenDayModal(day.dateStr)}
                className={`p-3 rounded-xl border text-center transition-all ${
                  isAdmin ? 'cursor-pointer hover:shadow-xs' : ''
                } ${
                  day.isSchoolDay
                    ? 'bg-white border-slate-200 hover:border-blue-400'
                    : 'bg-rose-50/60 border-rose-200 text-rose-900'
                }`}
              >
                <span className="block font-black text-sm text-slate-800">{day.dayNumber}</span>
                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mt-1 ${
                  day.isSchoolDay ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {day.isSchoolDay ? 'Sekolah' : 'Cuti'}
                </span>
                <p className="text-[10px] text-slate-500 mt-1 truncate" title={day.notes}>
                  {day.notes}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal Kemaskini Hari Kalendar */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={`Tetapan Takwim: ${selectedDateStr}`}
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

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="primary" isLoading={isSavingDay}>
                Simpan
              </Button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
};
