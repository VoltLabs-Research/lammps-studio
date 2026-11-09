import AtomViewport from '@/modules/viewport/components/AtomViewport';
import '@/modules/viewport/components/WorkspaceViewport/workspace-viewport.css';

const WorkspaceViewport = () => (
    <section className='viewport' aria-label='Last computed timestep'>
        <AtomViewport frame={null} colorMode='structure' showBox showAxes atomScale={1} bottomInset={0} />
    </section>
);

export default WorkspaceViewport;
