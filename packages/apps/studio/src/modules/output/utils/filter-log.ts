import { LogLine, LogLineKind } from '@lammps-studio/contracts/run/domain';
import { LogFilter } from '@/modules/output/domain/log';

const FILTER_KINDS: Record<Exclude<LogFilter, 'all'>, LogLineKind[]> = {
    thermo: ['thermo', 'head'],
    warnings: ['warning', 'error']
};

export const filterLog = (lines: LogLine[], filter: LogFilter): LogLine[] => {
    if(filter === 'all') return lines;

    const kinds = FILTER_KINDS[filter];

    return lines.filter((line) => kinds.includes(line.kind));
};
