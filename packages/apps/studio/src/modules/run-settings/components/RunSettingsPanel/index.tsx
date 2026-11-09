import { useDraftConfig, useDraftMachine, useOpenSimulation } from '@/modules/run-control/hooks/use-workspace';
import LammpsSection from '@/modules/run-settings/components/LammpsSection';
import MachineSection from '@/modules/run-settings/components/MachineSection';
import ParallelSection from '@/modules/run-settings/components/ParallelSection';
import ScriptSection from '@/modules/run-settings/components/ScriptSection';
import SlurmSection from '@/modules/run-settings/components/SlurmSection';
import { buildFor, typicalBuildMinutes } from '@/modules/run-settings/utils/build-match';
import { buildStateOf } from '@/modules/run-settings/utils/setting-facts';
import PanelHead from '@/shared/components/PanelHead';
import { useBuildsStore } from '@/shared/store/builds';
import { useRunSessionStore } from '@/shared/store/run-session';
import '@/modules/run-settings/components/RunSettingsPanel/run-settings.css';

const RunSettingsPanel = () => {
    const simulation = useOpenSimulation();
    const config = useDraftConfig();
    const machine = useDraftMachine();
    const builds = useBuildsStore((state) => state.items);
    const script = useRunSessionStore((state) => state.script);

    const head = <PanelHead title='Build and run' sub='Applies to the next run' />;
    if(!simulation || !config || !machine) return <>{head}<div className='panel__body' /></>;

    const build = buildStateOf(buildFor(builds, config), typicalBuildMinutes(builds, machine.id));
    const required = [...new Set(script?.requiredPackages.map((pkg) => pkg.name) ?? [])];

    return (
        <>
            {head}
            <div className='panel__body'>
                <div className='pane'>
                    <MachineSection simulation={simulation} machine={machine} />
                    {config.slurm ? <SlurmSection machine={machine} slurm={config.slurm} /> : null}
                    <LammpsSection config={config} machine={machine} build={build} required={required} />
                    <ParallelSection config={config} machine={machine} />
                    <ScriptSection simulationId={simulation.id} entry={simulation.entry} config={config} buildHash={build.hash} />
                </div>
            </div>
        </>
    );
};

export default RunSettingsPanel;
