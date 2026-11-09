import { LogLine } from '@lammps-studio/contracts/run/domain';
import { LOG_FILE, LogSummary } from '@/modules/output/domain/log';
import { formatInt } from '@/shared/utils/format';

const plural = (count: number, noun: string): string => `${formatInt(count)} ${noun}${count === 1 ? '' : 's'}`;

export const summarizeLog = (lines: LogLine[]): LogSummary => {
    let warnings = 0;
    let widest = 0;
    for(const line of lines){
        if(line.kind === 'warning') warnings += 1;
        widest = Math.max(widest, line.text.length);
    }

    return {
        lines: lines.length,
        warnings,
        widest
    };
};

export const outputSub = (summary: LogSummary, runNumber: number | null, failed: boolean): string => {
    if(runNumber === null) return LOG_FILE;
    if(summary.lines === 0) return `${LOG_FILE} · run ${runNumber}`;

    const parts = [LOG_FILE, `run ${runNumber}`, plural(summary.lines, 'line'), plural(summary.warnings, 'warning')];
    if(failed) parts.push('1 error');

    return parts.join(' · ');
};
