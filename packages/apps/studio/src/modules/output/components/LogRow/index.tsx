import { LogLine, LogLineKind } from '@lammps-studio/contracts/run/domain';
import { classNames } from '@/shared/utils/class-names';

interface LogRowProps{
    line: LogLine;
    fresh: boolean;
}

const KIND_CLASS: Record<LogLineKind, string | null> = {
    meta: 'meta',
    head: 'head',
    thermo: 'thermo',
    warning: 'warn',
    error: 'error',
    text: null
};

const LogRow = ({ line, fresh }: LogRowProps) => (
    <div className={classNames('log__line', KIND_CLASS[line.kind], fresh && 'new')}>
        <span className='n'>{line.index + 1}</span>
        <span>{line.text}</span>
    </div>
);

export default LogRow;
