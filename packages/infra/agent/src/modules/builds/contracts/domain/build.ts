import { Build } from '@lammps-studio/contracts/build/domain';
import { BuildIdentity } from '@lammps-studio/runtime/domain/build/BuildSpec';

export type BuildRecord = Omit<Build, 'usedBy'>;

export interface PreparedBuild{
    identity: BuildIdentity;
    ready: boolean;
}
