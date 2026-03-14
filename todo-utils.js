// Formats a Date object as a local YYYY-MM-DD string.
function formatDateLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Breaks a remaining duration into day, hour, and minute parts.
function getCountdownParts(msRemaining) {
  const totalMinutes = Math.max(0, Math.floor(msRemaining / 60000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const totalHours = Math.floor(totalMinutes / 60);
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const mins = totalMinutes % 60;
  return { days, totalHours, hours, mins };
}
