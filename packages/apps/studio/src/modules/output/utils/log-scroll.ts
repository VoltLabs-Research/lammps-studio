import { LogScrollMark, ScrollJump, ScrollMetrics } from '@/modules/output/domain/log';
import { LOG_ROW } from '@/modules/output/utils/log-window';

export const scrollJump = (previous: LogScrollMark | null, next: LogScrollMark, startAtTop: boolean): ScrollJump => {
    if(previous === null || previous.resetKey !== next.resetKey){
        if(next.follow && !startAtTop) return 'bottom';

        return 'top';
    }
    if(!next.follow) return null;
    if(next.count !== previous.count || !previous.follow) return 'bottom';

    return null;
};

export const awayFromBottom = ({ scrollTop, scrollHeight, clientHeight }: ScrollMetrics): boolean => {
    return scrollHeight - clientHeight - scrollTop > LOG_ROW;
};
