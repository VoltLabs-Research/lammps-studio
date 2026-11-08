import { codeServer } from './CodeServer';
import SimulationStoreService from '@/modules/simulations/services/SimulationStore';
import { EditorSession } from '@lammps-studio/contracts/editor/domain';

export default class EditorService{
    #simulations = new SimulationStoreService();

    async open(simulationId: string): Promise<EditorSession>{
        const simulation = await this.#simulations.find(simulationId);
        const base = await codeServer.open(simulationId, simulation.path);
        const query = new URLSearchParams({ folder: simulation.path });

        return { url: `${base}/?${query}` };
    }
}
