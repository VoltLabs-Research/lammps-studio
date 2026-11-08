import EntryScriptService from './EntryScript';
import RunHistoryService from './RunHistory';
import SimulationStoreService from './SimulationStore';
import SimulationTemplateService from './SimulationTemplate';
import MachineService from '@/modules/machines/services/Machine';
import ValidationError from '@lammps-studio/readable/errors/Validation';
import { SimulationError } from '../contracts/domain/errors';
import { SimulationRecord, StoredSimulation } from '../contracts/domain/simulation';
import { PREVIEW_FILE, RUNS_DIR, STUDIO_DIR } from '../utils/layout';
import { LOCAL_MACHINE_ID } from '@/modules/machines/services/LocalMachine';
import { eventBus } from '@/shared/events/EventBus';
import { isMissing, statIfExists } from '@/shared/utils/fsErrors';
import { EntryCandidate } from '@lammps-studio/contracts/script/domain';
import { Simulation } from '@lammps-studio/contracts/simulation/domain';
import { CreateSimulationInput, UpdateSimulationInput } from '@lammps-studio/contracts/simulation/http';
import { randomUUID } from 'node:crypto';
import { cp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

const COPY_SUFFIX = 'copy';
const FIRST_NUMBERED_COPY = 2;

const sameName = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase();

export default class SimulationService{
    #store = new SimulationStoreService();
    #templates = new SimulationTemplateService();
    #entries = new EntryScriptService();
    #runs = new RunHistoryService();
    #machines = new MachineService();

    async list(): Promise<Simulation[]>{
        const stored = await this.#store.list();

        return Promise.all(stored.map((simulation) => this.#view(simulation)));
    }

    async get(simulationId: string): Promise<Simulation>{
        return this.#view(await this.#store.find(simulationId));
    }

    async create(input: CreateSimulationInput): Promise<Simulation>{
        this.#machines.assertKnown(input.machineId);
        const name = await this.#availableName(input.name);

        const stored = await this.#store.create(this.#newRecord(name, null), (path) => this.#templates.fill(path, input));
        return this.#publish(stored);
    }

    async update(simulationId: string, input: UpdateSimulationInput): Promise<Simulation>{
        const stored = await this.#store.find(simulationId);
        const record: SimulationRecord = {
            ...stored.record,
            updatedAt: new Date().toISOString()
        };
        if(input.name !== undefined) record.name = await this.#availableName(input.name, simulationId);
        if(input.entry !== undefined) record.entry = await this.#entries.validate(stored.path, input.entry);

        await this.#store.write(stored.path, record);
        return this.#publish({ ...stored, record });
    }

    async remove(simulationId: string){
        const stored = await this.#store.find(simulationId);

        await rm(stored.path, { recursive: true });
        eventBus.emit({ type: 'simulation:removed', simulationId });
    }

    async duplicate(simulationId: string): Promise<Simulation>{
        const source = await this.#store.find(simulationId);
        const name = await this.#copyName(source.record.name);
        const skipped = [join(source.path, RUNS_DIR), join(source.path, STUDIO_DIR, PREVIEW_FILE)];

        const stored = await this.#store.create(this.#newRecord(name, source.record.entry), (path) => cp(source.path, path, {
            recursive: true,
            filter: (from) => !skipped.includes(from)
        }));
        return this.#publish(stored);
    }

    async entryCandidates(simulationId: string): Promise<EntryCandidate[]>{
        const stored = await this.#store.find(simulationId);

        return this.#entries.candidates(stored.path);
    }

    async preview(simulationId: string): Promise<Buffer>{
        const stored = await this.#store.find(simulationId);

        try{
            return await readFile(join(stored.path, STUDIO_DIR, PREVIEW_FILE));
        }catch(error: unknown){
            if(isMissing(error)) throw SimulationError.NoPreview();
            throw error;
        }
    }

    async #view({ folder, path, record }: StoredSimulation): Promise<Simulation>{
        const [entry, lastRun, preview] = await Promise.all([
            record.entry ?? this.#entries.defaultEntry(path),
            this.#runs.last(path),
            statIfExists(join(path, STUDIO_DIR, PREVIEW_FILE))
        ]);

        return {
            id: record.id,
            name: record.name,
            machineId: LOCAL_MACHINE_ID,
            folder,
            entry,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            lastRun,
            hasPreview: preview !== null
        };
    }

    async #publish(stored: StoredSimulation): Promise<Simulation>{
        const simulation = await this.#view(stored);

        eventBus.emit({ type: 'simulation:updated', simulation });
        return simulation;
    }

    async #availableName(requested: string, ownId?: string): Promise<string>{
        const name = requested.trim();
        if(name === '') throw new ValidationError({ name: 'Required' });

        const stored = await this.#store.list();
        if(stored.some((other) => other.record.id !== ownId && sameName(other.record.name, name))){
            throw SimulationError.NameTaken();
        }
        return name;
    }

    async #copyName(name: string): Promise<string>{
        const taken = (await this.#store.list()).map((stored) => stored.record.name);

        let candidate = `${name} ${COPY_SUFFIX}`;
        for(let number = FIRST_NUMBERED_COPY; taken.some((other) => sameName(other, candidate)); number += 1){
            candidate = `${name} ${COPY_SUFFIX} ${number}`;
        }
        return candidate;
    }

    #newRecord(name: string, entry: string | null): SimulationRecord{
        const now = new Date().toISOString();

        return {
            id: randomUUID(),
            name,
            entry,
            createdAt: now,
            updatedAt: now
        };
    }
}
