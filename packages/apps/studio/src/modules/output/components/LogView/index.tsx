import { LogLine } from '@lammps-studio/contracts/run/domain';
import { useRef } from 'react';
import LogRow from '@/modules/output/components/LogRow';
import { useLogScroll } from '@/modules/output/hooks/use-log-scroll';
import { LOG_GUTTER, LOG_ROW, logHeight, logWindow } from '@/modules/output/utils/log-window';
import '@/modules/output/components/LogView/log.css';

interface LogViewProps{
    lines: LogLine[];
    widest: number;
    resetKey: string;
    startAtTop: boolean;
    follow: boolean;
    freshFrom: number;
    onUnfollow: () => void;
}

const LogView = ({ lines, widest, resetKey, startAtTop, follow, freshFrom, onUnfollow }: LogViewProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const { scrollTop, viewport, onScroll } = useLogScroll(ref, { count: lines.length, follow, resetKey, startAtTop, onUnfollow });
    const { start, end } = logWindow({ scrollTop, viewport, count: lines.length });

    return (
        <div ref={ref} className='panel__body' onScroll={onScroll}>
            {lines.length === 0
                ? (
                    <div className='log'>
                        <div className='log__line meta'><span className='n' /><span>No lines match this filter.</span></div>
                    </div>
                )
                : (
                    <div className='log' style={{ height: logHeight(lines.length), minWidth: `calc(${LOG_GUTTER}px + ${widest}ch)` }}>
                        <div style={{ transform: `translateY(${start * LOG_ROW}px)` }}>
                            {lines.slice(start, end).map((line) => <LogRow key={line.index} line={line} fresh={line.index >= freshFrom} />)}
                        </div>
                    </div>
                )}
        </div>
    );
};

export default LogView;
