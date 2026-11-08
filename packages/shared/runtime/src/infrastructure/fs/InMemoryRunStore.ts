import { RunStore } from '../../ports/RunStore';
import Run from '../../domain/simulation/Run';

export default class InMemoryRunStore implements RunStore{
    private readonly runs = new Map<string, Run>();

    async save(run: Run){
        this.runs.set(run.id, run);
    }

    async update(run: Run){
        this.runs.set(run.id, run);
    }

    async get(id: string): Promise<Run | null>{
        return this.runs.get(id) ?? null;
    }

    async list(): Promise<Run[]>{
        return [...this.runs.values()];
    }
}
