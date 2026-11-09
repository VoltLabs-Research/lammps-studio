import { Machine } from '@lammps-studio/contracts/machine/domain';
import { RunConfig } from '@lammps-studio/contracts/run/domain';
import { BuildState } from '@/modules/run-settings/domain/settings';
import { patchDraft, toggleDraftPackage } from '@/modules/run-settings/utils/draft-edits';
import { physicsPackages } from '@/modules/run-settings/utils/draft-packages';
import { packageEntries, versionEntries, versionLabel } from '@/modules/run-settings/utils/setting-entries';
import { lammpsFoot, packagesText } from '@/modules/run-settings/utils/setting-facts';
import Group from '@/shared/components/Group';
import GroupRow from '@/shared/components/GroupRow';
import Popup from '@/shared/components/Popup';

interface LammpsSectionProps{
    config: RunConfig;
    machine: Machine;
    build: BuildState;
    required: string[];
}

const PACKAGES_WIDTH = 300;

const LammpsSection = ({ config, machine, build, required }: LammpsSectionProps) => {
    const physics = physicsPackages(config.packages);
    const packages = packageEntries({ selected: config.packages, required, entry: config.entry, toggle: toggleDraftPackage });

    return (
        <Group title='LAMMPS' foot={lammpsFoot(build, machine.name)}>
            <GroupRow label='Version'>
                <Popup label='Version' value={versionLabel(config.version)} entries={versionEntries(config.version, (version) => patchDraft({ version }))} />
            </GroupRow>
            <GroupRow label='Packages'>
                <Popup label='Packages' value={packagesText(physics)} entries={packages} width={PACKAGES_WIDTH} />
            </GroupRow>
            <GroupRow label='Build'>
                {build.ready
                    ? (
                        <>
                            <span className='mono muted'>{build.hash}</span>
                            <span>Ready</span>
                        </>
                    )
                    : <span className='warn-ink'>Compiles first · about {build.minutes} min</span>}
            </GroupRow>
        </Group>
    );
};

export default LammpsSection;
