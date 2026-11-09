import { LogLine } from '@lammps-studio/contracts/run/domain';
import { LOG_FILE } from '@/modules/output/domain/log';
import { copyText } from '@/shared/services/clipboard';
import { saveBlob } from '@/shared/services/save-file';

const logText = (lines: LogLine[]): string => lines.map((line) => line.text).join('\n');

export const nextLineIndex = (lines: LogLine[]): number => {
    const last = lines.at(-1);
    if(!last) return 0;

    return last.index + 1;
};

export const copyLog = (lines: LogLine[]) => copyText(logText(lines), 'Copied the log');

export const saveLog = (lines: LogLine[]) => saveBlob(new Blob([`${logText(lines)}\n`], { type: 'text/plain' }), LOG_FILE);
