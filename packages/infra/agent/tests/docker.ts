import { SIMULATION_LABEL } from '@lammps-studio/runtime/domain/simulation/RunSpec';
import { execFileSync } from 'node:child_process';

export const dockerAvailable = (): boolean => {
    try{
        execFileSync('docker', ['info'], { stdio: 'ignore' });
        return true;
    }catch{
        return false;
    }
};

export const removeRunningContainersOf = (simulationId: string) => {
    const ids = execFileSync('docker', ['ps', '-q', '--filter', `label=${SIMULATION_LABEL}=${simulationId}`], { encoding: 'utf8' }).split('\n').filter(Boolean);
    if(ids.length > 0) execFileSync('docker', ['rm', '-f', ...ids], { stdio: 'ignore' });
};
