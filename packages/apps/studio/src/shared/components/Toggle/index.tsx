import '@/shared/components/Toggle/toggle.css';

interface ToggleProps{
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

const Toggle = ({ label, checked, onChange }: ToggleProps) => (
    <button type='button' className='toggle' role='switch' aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} />
);

export default Toggle;
