import BuildStoreService from './BuildStore';
import MachineService from '@/modules/machines/services/Machine';
import RunHistoryService from '@/modules/simulations/services/RunHistory';
import SimulationStoreService from '@/modules/simulations/services/SimulationStore';
import { BuildError } from '../contracts/domain/errors';
import { BuildRecord, PreparedBuild } from '../contracts/domain/build';
import { buildOutputOf } from '../utils/buildOutput';
import { MachineError } from '@/modules/machines/contracts/domain/errors';
import { LOCAL_MACHINE_ID } from '@/modules/machines/services/LocalMachine';
import { eventBus } from '@/shared/events/EventBus';
import { Build } from '@lammps-studio/contracts/build/domain';
import { CreateBuildInput } from '@lammps-studio/contracts/build/http';
import { logger } from '@lammps-studio/readable/utils/Logger';
import { BuildIdentity, BuildResult, BuildSpec } from '@lammps-studio/runtime/domain/build/BuildSpec';
import { BuildErrorEvent, BuildProgressEvent } from '@lammps-studio/runtime/domain/observability/EventMap';
import { isDockerConflict, isDockerUnreachable } from '@lammps-studio/runtime/domain/shared/toError';
import { ImageInfo } from '@lammps-studio/runtime/ports/ImageBuilderPort';
import LammpsRuntime from '@lammps-studio/runtime/public/LammpsRuntime';

const PROGRESS_EVERY_MS = 500;
const INTERRUPTED = 'The agent stopped before this build finished';
const SCOPE = 'builds';

const newestFirst = (a: BuildRecord, b: BuildRecord): number => b.createdAt.localeCompare(a.createdAt);

const readyRecord = (record: BuildRecord, sizeBytes: number, buildSeconds: number | null): BuildRecord => ({
    ...record,
    status: 'ready',
    progress: 1,
    sizeBytes,
    buildSeconds
});

const failedRecord = (record: BuildRecord, output: string): BuildRecord => ({
    ...record,
    status: 'failed',
    output
});

export default class BuildService{
    #store = new BuildStoreService();
    #simulations = new SimulationStoreService();
    #history = new RunHistoryService();
    #machines = new MachineService();
    #opened: LammpsRuntime | null = null;
    #records = new Map<string, BuildRecord>();
    #usedBy = new Map<string, number>();
    #announcedAt = new Map<string, number>();
    #unsubscribe: Array<() => void> = [];
    #dirty = false;
    #writing: Promise<void> | null = null;

    async open(runtime: LammpsRuntime){
        this.#opened = runtime;
        this.#records = new Map((await this.#store.read()).map((record) => [record.hash, record]));
        this.#unsubscribe = [
            runtime.on('build:start', (identity) => this.#inBackground(this.#recordOf(identity))),
            runtime.on('build:progress', (event) => this.#progressed(event)),
            runtime.on('build:end', ({ result }) => this.#built(result)),
            runtime.on('build:error', (event) => this.#failed(event))
        ];
        await this.#settleInterrupted(runtime);
        await this.#usage();
    }

    close(){
        for(const unsubscribe of this.#unsubscribe) unsubscribe();
        this.#unsubscribe = [];
        this.#opened = null;
    }

    async list(): Promise<Build[]>{
        await this.#usage();

        return [...this.#records.values()].sort(newestFirst).map((record) => this.#withUsage(record));
    }

    async get(hash: string): Promise<Build>{
        const record = this.#find(hash);
        await this.#usage();

        return this.#withUsage(record);
    }

    async create(input: CreateBuildInput): Promise<Build>{
        this.#machines.assertKnown(input.machineId);
        const spec: BuildSpec = {
            version: input.version,
            packages: input.packages
        };

        const { identity, ready } = await this.prepare(spec);
        if(!ready && !this.#isBuilding(identity.hash)) this.#launch(spec);

        return this.get(identity.hash);
    }

    async remove(hash: string){
        const record = this.#find(hash);
        await this.#usage();
        if(record.status === 'building' || this.#withUsage(record).usedBy > 0) throw BuildError.InUse();

        await this.#removeImage(record.image);
        this.#records.delete(hash);
        await this.#save();
    }

    async prepare(spec: BuildSpec): Promise<PreparedBuild>{
        const runtime = this.#runtime();
        const identity = runtime.describeBuild(spec);
        if(this.#isBuilding(identity.hash)) return { identity, ready: false };

        const image = await this.#inspect(runtime, identity.tag);
        if(image === null) return { identity, ready: false };

        await this.#adopt(identity, image);
        return { identity, ready: true };
    }

    async ensure(spec: BuildSpec, signal: AbortSignal){
        await this.#runtime().build(spec, signal);
    }

    #launch(spec: BuildSpec){
        void this.#runtime().build(spec).catch((error: unknown) => {
            logger.debug('The build ended without an image; its record carries the failure', { scope: SCOPE, error: String(error) });
        });
    }

    #progressed({ hash, progress, steps, output }: BuildProgressEvent){
        const record = this.#records.get(hash);
        if(record?.status !== 'building') return;

        this.#records.set(hash, { ...record, progress, steps, output });
        const now = Date.now();
        if(now - (this.#announcedAt.get(hash) ?? 0) < PROGRESS_EVERY_MS) return;

        this.#announcedAt.set(hash, now);
        this.#announce(hash);
    }

    #built(result: BuildResult){
        const record = this.#records.get(result.hash) ?? this.#recordOf(result);

        this.#inBackground(readyRecord(record, result.sizeBytes, result.seconds ?? record.buildSeconds));
    }

    #failed({ hash, error }: BuildErrorEvent){
        const record = this.#records.get(hash);
        if(record?.status !== 'building') return;

        this.#inBackground(failedRecord(record, buildOutputOf(error)));
    }

    async #adopt(identity: BuildIdentity, image: ImageInfo){
        const record = this.#records.get(identity.hash);
        if(record?.status === 'ready' && record.sizeBytes === image.sizeBytes) return;

        const known = record ?? this.#recordOf(identity);
        await this.#put(readyRecord(known, image.sizeBytes, known.buildSeconds));
    }

    async #settleInterrupted(runtime: LammpsRuntime){
        const interrupted = [...this.#records.values()].filter((record) => record.status === 'building');

        for(const record of interrupted){
            const image = await this.#imageAtBoot(runtime, record.image);
            this.#records.set(record.hash, image === null ? failedRecord(record, INTERRUPTED) : readyRecord(record, image.sizeBytes, null));
        }
        if(interrupted.length > 0) await this.#save();
    }

    #recordOf({ hash, tag, version, packages }: BuildIdentity): BuildRecord{
        return {
            hash,
            machineId: LOCAL_MACHINE_ID,
            version,
            packages,
            image: tag,
            sizeBytes: null,
            status: 'building',
            progress: 0,
            steps: [],
            output: null,
            buildSeconds: null,
            createdAt: new Date().toISOString()
        };
    }

    #put(record: BuildRecord): Promise<void>{
        this.#records.set(record.hash, record);
        this.#announce(record.hash);

        return this.#save();
    }

    #inBackground(record: BuildRecord){
        this.#put(record).catch((error: unknown) => {
            logger.error('Could not save the builds file', error, { scope: SCOPE, hash: record.hash });
        });
    }

    #announce(hash: string){
        const record = this.#records.get(hash);
        if(record) eventBus.emit({ type: 'build:updated', build: this.#withUsage(record) });
    }

    #save(): Promise<void>{
        this.#dirty = true;
        this.#writing ??= this.#write();

        return this.#writing;
    }

    async #write(){
        try{
            while(this.#dirty){
                this.#dirty = false;
                await this.#store.write([...this.#records.values()].sort(newestFirst));
            }
        }finally{
            this.#writing = null;
        }
    }

    async #usage(){
        const usedBy = new Map<string, number>();
        for(const simulation of await this.#simulations.list()){
            for(const run of await this.#history.list(simulation.path)){
                usedBy.set(run.buildHash, (usedBy.get(run.buildHash) ?? 0) + 1);
            }
        }
        this.#usedBy = usedBy;
    }

    #withUsage(record: BuildRecord): Build{
        return {
            ...record,
            usedBy: this.#usedBy.get(record.hash) ?? 0
        };
    }

    #find(hash: string): BuildRecord{
        const record = this.#records.get(hash);
        if(!record) throw BuildError.NotFound();

        return record;
    }

    #isBuilding(hash: string): boolean{
        return this.#records.get(hash)?.status === 'building';
    }

    #runtime(): LammpsRuntime{
        if(this.#opened === null) throw MachineError.Offline();

        return this.#opened;
    }

    async #inspect(runtime: LammpsRuntime, tag: string): Promise<ImageInfo | null>{
        try{
            return await runtime.inspectImage(tag);
        }catch(error: unknown){
            if(isDockerUnreachable(error)) throw MachineError.Offline();
            throw error;
        }
    }

    async #imageAtBoot(runtime: LammpsRuntime, tag: string): Promise<ImageInfo | null>{
        try{
            return await runtime.inspectImage(tag);
        }catch(error: unknown){
            if(isDockerUnreachable(error)) return null;
            throw error;
        }
    }

    async #removeImage(tag: string){
        try{
            await this.#runtime().removeImage(tag);
        }catch(error: unknown){
            if(isDockerUnreachable(error)) throw MachineError.Offline();
            if(isDockerConflict(error)) throw BuildError.InUse();
            throw error;
        }
    }
}

export const builds = new BuildService();
