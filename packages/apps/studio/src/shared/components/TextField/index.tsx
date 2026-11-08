import { useId } from 'react';
import { classNames } from '@/shared/utils/class-names';
import '@/shared/components/TextField/text-field.css';

interface TextFieldProps{
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    mono?: boolean;
}

const TextField = ({ label, value, onChange, placeholder, mono = false }: TextFieldProps) => {
    const id = useId();

    return (
        <div>
            <label className='label' htmlFor={id}>{label}</label>
            <input
                id={id}
                className={classNames('field', mono && 'mono')}
                value={value}
                placeholder={placeholder}
                autoComplete='off'
                spellCheck={!mono}
                onChange={(event) => onChange(event.target.value)}
            />
        </div>
    );
};

export default TextField;
