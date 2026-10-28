/**
 * Time helpers for an IANA timezone (e.g. "Europe/Zurich"), falling back to
 * the browser's timezone
 */

/** Timestamp (seconds) to "YYYY-MM-DD HH:MM" (Swedish locale formats ISO-like) */
export const formatTime = (timestamp, timeZone) =>
  new Date(timestamp * 1000).toLocaleString("sv-SE", { timeZone: timeZone || undefined }).slice(0, 16);

/** Timestamp (seconds) to "YYYY-MM-DD" */
export const formatDate = (timestamp, timeZone) => formatTime(timestamp, timeZone).slice(0, 10);

/** Wall-clock "YYYY-MM-DD" and "HH:MM" to timestamp (seconds) */
export const toTimestamp = (date, time, timeZone) => {
  const asUtc = Date.parse(`${date}T${time}Z`) / 1000;
  const wallClock = Date.parse(`${formatTime(asUtc, timeZone).replace(" ", "T")}Z`) / 1000;
  return asUtc - (wallClock - asUtc);
};
