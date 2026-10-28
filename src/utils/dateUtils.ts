/**
 * Utiliti Tarikh & Waktu Malaysia (Asia/Kuala_Lumpur)
 */

export function getTodayMalaysianDate(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date()); // Format: YYYY-MM-DD
}

export function getMalaysianCurrentTime(): string {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  return formatter.format(new Date()); // Format: HH:mm
}

/**
 * Menukar rentetan masa format HH:mm kepada jumlah minit daripada tengah malam.
 * Menghapuskan ralat leksikografi rentetan (contoh: '12:30' vs '8:00').
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return 0;
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

/**
 * Menormalkan rentetan masa kepada format 24-jam standard dua digit (HH:mm).
 * Contoh: '8:00' -> '08:00', '6:30' -> '06:30'.
 */
export function normalizeTimeString(timeStr: string): string {
  if (!timeStr || typeof timeStr !== 'string') return '00:00';
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return '00:00';
  const h = String(parseInt(parts[0], 10) || 0).padStart(2, '0');
  const m = String(parseInt(parts[1], 10) || 0).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Menyemak sama ada masa semasa berada dalam jendela masa mula dan tamat (inklusif mula, eksklusif tamat).
 */
export function isTimeWithinRange(currentTime: string, startTime: string, endTime: string): boolean {
  const cur = timeToMinutes(currentTime);
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  return cur >= start && cur < end;
}

export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat('ms-MY', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  } catch {
    return dateStr;
  }
}

export function formatDisplayTime(timestamp: any): string {
  if (!timestamp) return '-';
  try {
    let date: Date;
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string') {
      return timestamp;
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else {
      return '-';
    }

    return new Intl.DateTimeFormat('ms-MY', {
      timeZone: 'Asia/Kuala_Lumpur',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(date);
  } catch {
    return '-';
  }
}

export function isWeekend(dateStr: string): boolean {
  if (!dateStr) return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  const dayOfWeek = new Date(year, month - 1, day).getDay();
  // 0 = Ahad, 6 = Sabtu (Kumpulan B standard Malaysia)
  return dayOfWeek === 0 || dayOfWeek === 6;
}

export function getMonthNameBM(monthNumber: number): string {
  const months = [
    'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
    'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'
  ];
  return months[monthNumber - 1] || '';
}

export function parseYMD(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

export function toYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateShortBM(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const shortMonths = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
    return `${day} ${shortMonths[month - 1] || ''} ${year}`;
  } catch {
    return dateStr;
  }
}

export function getDayNameBM(dateStr: string): string {
  if (!dateStr) return '';
  const d = parseYMD(dateStr);
  const dayNames = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
  return dayNames[d.getDay()] || '';
}

export function getWeekDays(targetDateStr: string): {
  startDate: string;
  endDate: string;
  weekNumber: number;
  label: string;
  days: { date: string; dayName: string; shortName: string }[];
} {
  const d = parseYMD(targetDateStr);
  const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay(); // 1=Mon .. 7=Sun
  const diffToMon = 1 - dayOfWeek;
  
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMon);

  const days: { date: string; dayName: string; shortName: string }[] = [];
  const dayNames = ['Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat'];
  const shortNames = ['ISN', 'SEL', 'RAB', 'KHA', 'JUM'];

  for (let i = 0; i < 5; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    days.push({
      date: toYMD(cur),
      dayName: dayNames[i],
      shortName: shortNames[i]
    });
  }

  const startDate = days[0].date;
  const endDate = days[4].date;

  // Kira nombor minggu ISO
  const temp = new Date(monday.valueOf());
  temp.setDate(temp.getDate() + 3 - (temp.getDay() + 6) % 7);
  const firstThursday = temp.valueOf();
  temp.setMonth(0, 1);
  if (temp.getDay() !== 4) {
    temp.setMonth(0, 1 + ((4 - temp.getDay()) + 7) % 7);
  }
  const weekNumber = 1 + Math.ceil((firstThursday - temp.valueOf()) / 604800000);

  return {
    startDate,
    endDate,
    weekNumber,
    label: `Minggu ${weekNumber} (${formatDateShortBM(startDate)} - ${formatDateShortBM(endDate)})`,
    days
  };
}

export function getDaysInDateRange(startDate: string, endDate: string): string[] {
  const result: string[] = [];
  let cur = parseYMD(startDate);
  const end = parseYMD(endDate);

  while (cur <= end) {
    result.push(toYMD(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

