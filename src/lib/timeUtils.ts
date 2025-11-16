/**
 * Formats minutes into a user-friendly "X hours and Y minutes" format
 * @param minutes - Total minutes to format
 * @returns Formatted string
 */
export const formatMinutesToHoursAndMinutes = (minutes: number): string => {
  const roundedMinutes = Math.round(minutes);
  
  if (roundedMinutes < 60) {
    return `${roundedMinutes} minute${roundedMinutes !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(roundedMinutes / 60);
  const remainingMinutes = roundedMinutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  return `${hours} hour${hours !== 1 ? 's' : ''} and ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
};
