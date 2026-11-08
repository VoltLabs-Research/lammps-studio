import type { LogLineKind, RunError, ThermoSection } from '@lammps-studio/contracts/run/domain';
import { isNumeric, parseNumber, splitTokens } from '../shared/text';
import { LogRead, META_PREFIX, ThermoRow } from './domain';

const BANNER = /^LAMMPS \(.+\)\s*$/;
const MEMORY = /^\s*(?:Per MPI rank memory allocation|Memory usage per processor)/;
const LOOP_TIME = /^\s*Loop time of /;
const WARNING = /^\s*WARNING(?: on proc \d+)?:/;
const ERROR = /^\s*ERROR(?: on proc \d+)?:\s*(.*)$/;
const LAST_COMMAND = /^\s*Last command:/;
const RUN_COMMAND = /^\s*run\s+(\d+)(?:\s|$)/;
const MINIMIZE_COMMAND = /^\s*minimize\s/;
const SOURCE_LOCATION = /\s*\([^()]*\.(?:cpp|h)(?::\d+)?\)\s*$/;
const STEP_COLUMN = 'Step';

type ReaderState = 'idle' | 'header' | 'rows';

export default class LogReader{
    readonly sections: ThermoSection[] = [];
    error: RunError | null = null;
    warnings = 0;
    totalSteps: number | null = null;
    lastStep: number | null = null;
    #index = 0;
    #state: ReaderState = 'idle';
    #pendingSteps: number | null = null;

    read(text: string): LogRead{
        const index = this.#index;
        this.#index += 1;

        const thermo = this.#state === 'rows' ? this.#readRow(text) : null;
        const kind = thermo ? 'thermo' : this.#classify(text, index);

        return {
            line: {
                index,
                text,
                kind
            },
            thermo
        };
    }

    #classify(text: string, index: number): LogLineKind{
        if(text.startsWith(META_PREFIX)){
            return 'meta';
        }

        if(ERROR.test(text)){
            this.#recordError(text, index);
            return 'error';
        }

        if(LAST_COMMAND.test(text)){
            return 'error';
        }

        if(WARNING.test(text)){
            this.warnings += 1;
            return 'warning';
        }

        if(BANNER.test(text)){
            return 'head';
        }

        return this.#trackSections(text);
    }

    #trackSections(text: string): LogLineKind{
        if(MEMORY.test(text)){
            this.#state = 'header';
            return 'text';
        }

        if(this.#state === 'header' && this.#openSection(text)){
            return 'head';
        }

        if(LOOP_TIME.test(text)){
            this.#state = 'idle';
            return 'text';
        }

        this.#trackRunCommand(text);
        return 'text';
    }

    #trackRunCommand(text: string){
        const run = RUN_COMMAND.exec(text);
        if(run){
            this.#pendingSteps = Number(run[1]);
            return;
        }

        if(MINIMIZE_COMMAND.test(text)){
            this.#pendingSteps = null;
        }
    }

    #openSection(text: string): boolean{
        const columns = splitTokens(text);
        if(columns.length === 0 || columns.some(isNumeric)){
            return false;
        }

        this.sections.push({
            section: this.sections.length,
            columns,
            rows: []
        });
        this.totalSteps = this.#pendingSteps;
        this.#pendingSteps = null;
        this.#state = 'rows';

        return true;
    }

    #readRow(text: string): ThermoRow | null{
        const section = this.sections.at(-1);
        const tokens = splitTokens(text);

        if(!section || tokens.length !== section.columns.length || !tokens.every(isNumeric)){
            return null;
        }

        const values = tokens.map(parseNumber);
        const step = values[section.columns.indexOf(STEP_COLUMN)];
        section.rows.push(values);

        if(step !== undefined){
            this.lastStep = step;
        }

        return {
            section: section.section,
            columns: section.columns,
            values
        };
    }

    #recordError(text: string, index: number){
        this.#state = 'idle';
        if(this.error){
            return;
        }

        const message = (ERROR.exec(text)?.[1] ?? text).replace(SOURCE_LOCATION, '');
        this.error = {
            message,
            step: this.lastStep,
            line: index
        };
    }
}
