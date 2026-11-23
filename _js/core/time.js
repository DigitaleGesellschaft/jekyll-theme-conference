/**
 * Time helpers for an IANA timezone (e.g. "Europe/Zurich"), falling back to
 * the browser's timezone
 */

/** Timestamp (seconds) to "YYYY-MM-DD HH:MM" (Swedish locale formats ISO-like) */
export const formatTime = (timestamp, timeZone) =>
  new Date(timestamp * 1000).toLocaleString("sv-SE", { timeZone: timeZone || undefined }).slice(0, 16);

/** Timestamp (seconds) to "YYYY-MM-DD" */
export const formatDate = (timestamp, timeZone) => formatTime(timestamp, timeZone).slice(0, 10);

// Offset (seconds) of the timezone from UTC at a timestamp
const offsetAt = (timestamp, timeZone) =>
  Date.parse(`${formatTime(timestamp, timeZone).replace(" ", "T")}Z`) / 1000 - timestamp;

/** Wall-clock "YYYY-MM-DD" and "HH:MM" (also "H:MM") to timestamp (seconds) */
export const toTimestamp = (date, time, timeZone) => {
  const asUtc = Date.parse(`${date}T${time.padStart(5, "0")}Z`) / 1000;
  // Offset at the result, not at the wall-clock time read as UTC: they
  // differ within hours of a change to or from daylight saving time
  const guess = asUtc - offsetAt(asUtc, timeZone);
  return asUtc - offsetAt(guess, timeZone);
};
