import { SimulationTemplate } from '@lammps-studio/contracts/simulation/domain';
import OptionCard from '@/modules/simulations/components/OptionCard';
import { TEMPLATES } from '@/modules/simulations/utils/templates';

interface TemplateOptionsProps{
    template: SimulationTemplate;
    onSelect: (template: SimulationTemplate) => void;
}

const TemplateOptions = ({ template, onSelect }: TemplateOptionsProps) => (
    <div>
        <span className='label'>Start from</span>
        <div className='opt-cards' role='radiogroup' aria-label='Start from'>
            {TEMPLATES.map((option) => (
                <OptionCard
                    key={option.value}
                    icon={option.icon}
                    title={option.title}
                    sub={option.sub}
                    checked={template === option.value}
                    onSelect={() => onSelect(option.value)}
                />
            ))}
        </div>
    </div>
);

export default TemplateOptions;
