import { Command } from '@/modules/palette/contracts/command';
import Icon from '@/shared/components/Icon';
import Kbd from '@/shared/components/Kbd';
import '@/shared/components/MenuItem/menu-item.css';

interface PaletteOptionProps{
    id: string;
    command: Command;
    selected: boolean;
    onRun: (command: Command) => void;
}

const PaletteOption = ({ id, command, selected, onRun }: PaletteOptionProps) => (
    <button type='button' id={id} className='menu-item' role='option' aria-selected={selected} tabIndex={-1} onClick={() => onRun(command)}>
        <Icon glyph={command.icon} size='sm' />
        <span>{command.label}</span>
        {command.kbd ? <Kbd>{command.kbd}</Kbd> : null}
    </button>
);

export default PaletteOption;
