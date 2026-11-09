import { Check } from 'lucide-react';
import { BuildLine } from '@/modules/run-control/domain/run-control';
import Icon from '@/shared/components/Icon';
import { classNames } from '@/shared/utils/class-names';

interface BuildStepRowProps{
    line: BuildLine;
}

const BuildStepRow = ({ line }: BuildStepRowProps) => (
    <div className={classNames('build__step', line.state !== 'pending' && line.state)}>
        {line.state === 'done' ? <Icon glyph={Check} size='xs' /> : <i />}
        {line.label}
    </div>
);

export default BuildStepRow;
