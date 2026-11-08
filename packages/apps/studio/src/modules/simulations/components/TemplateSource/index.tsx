import { NewSimulationForm } from '@/modules/simulations/hooks/use-new-simulation-form';
import { EXAMPLES } from '@/modules/simulations/utils/templates';
import Seg from '@/shared/components/Seg';
import TextField from '@/shared/components/TextField';

interface TemplateSourceProps{
    form: NewSimulationForm;
}

const TemplateSource = ({ form }: TemplateSourceProps) => {
    if(form.template === 'example'){
        return (
            <div>
                <span className='label'>Example</span>
                <Seg label='Example' size='sm' options={EXAMPLES} value={form.example} onChange={form.setExample} />
            </div>
        );
    }

    if(form.template === 'folder'){
        return <TextField label='Folder' mono placeholder='~/simulations/cu-nanowire' value={form.folder} onChange={form.setFolder} />;
    }

    if(form.template === 'git'){
        return <TextField label='Repository URL' mono placeholder='https://github.com/you/simulation.git' value={form.repository} onChange={form.setRepository} />;
    }

    return null;
};

export default TemplateSource;
