import { KeyboardEvent } from 'react';
import type { TabOption, VariablesTab } from '@/modules/variables/domain/variables';

interface VariablesTabsProps{
    tab: VariablesTab;
    onChange: (tab: VariablesTab) => void;
}

const TABS: TabOption[] = [
    { value: 'variables', label: 'Variables' },
    { value: 'computes', label: 'Computes' },
    { value: 'fixes', label: 'Fixes' },
    { value: 'dumps', label: 'Dumps' }
];

const STEP: Record<string, number> = {
    ArrowLeft: -1,
    ArrowRight: 1
};

const VariablesTabs = ({ tab, onChange }: VariablesTabsProps) => {
    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const step = STEP[event.key];
        if(step === undefined) return;

        event.preventDefault();
        const index = TABS.findIndex((option) => option.value === tab);
        const next = TABS[(index + step + TABS.length) % TABS.length];
        onChange(next.value);
        event.currentTarget.querySelector<HTMLButtonElement>(`[data-tab="${next.value}"]`)?.focus();
    };

    return (
        <div className='tabs' role='tablist' aria-label='Script' onKeyDown={onKeyDown}>
            {TABS.map((option) => (
                <button
                    key={option.value}
                    type='button'
                    role='tab'
                    data-tab={option.value}
                    aria-selected={option.value === tab}
                    tabIndex={option.value === tab ? 0 : -1}
                    onClick={() => onChange(option.value)}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
};

export default VariablesTabs;
