const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;

export const formatDuration = (seconds: number): string => {
    const whole = Math.round(seconds);
    const hours = Math.floor(whole / SECONDS_PER_HOUR);
    const minutes = Math.floor((whole % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
    const rest = whole % SECONDS_PER_MINUTE;

    if(hours > 0 && minutes === 0) return `${hours} h`;
    if(hours > 0) return `${hours} h ${minutes} min`;
    if(minutes > 0 && rest === 0) return `${minutes} min`;
    if(minutes > 0) return `${minutes} min ${rest} s`;

    return `${rest} s`;
};
