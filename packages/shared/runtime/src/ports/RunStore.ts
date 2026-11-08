import Run from '../domain/simulation/Run';

export interface RunStore{
    save(run: Run): Promise<void>;
    update(run: Run): Promise<void>;
    get(id: string): Promise<Run | null>;
    list(): Promise<Run[]>;
}
