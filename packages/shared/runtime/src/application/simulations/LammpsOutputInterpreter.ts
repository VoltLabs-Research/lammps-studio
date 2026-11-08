import type { ScalarValue } from '../../domain/shared/types';

const NUMBER_PATTERN = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eEdD][+-]?\d+)?$/;
const WHITESPACE = /\s+/;

export interface InterpretedThermoEvent{
    type: 'thermo';
    step: number | null;
    values: Record<string, ScalarValue>;
    raw: string;
}

export interface InterpretedTimestepEvent{
    type: 'timestep';
    step: number;
    source: 'thermo';
}

export type InterpretedOutputEvent = InterpretedThermoEvent | InterpretedTimestepEvent;

const tokenize = (line: string): string[] => {
    return line.trim().split(WHITESPACE).filter(Boolean);
};

const parseScalar = (value: string): ScalarValue => {
    if(!NUMBER_PATTERN.test(value)){
        return value;
    }

    return Number(value.replace(/[dD]/g, 'e'));
};

export default class LammpsOutputInterpreter{
    private thermoHeader: string[] | null = null;

    consume(line: string): InterpretedOutputEvent[]{
        const trimmed = line.trim();
        if(trimmed.length === 0) return [];

        const tokens = tokenize(line);
        if(tokens[0] === 'Step' && tokens.length > 1){
            this.thermoHeader = tokens;
            return [];
        }

        if(trimmed.startsWith('Loop time of')){
            this.thermoHeader = null;
            return [];
        }

        const header = this.thermoHeader;
        if(!header || tokens.length !== header.length || !NUMBER_PATTERN.test(tokens[0])){
            return [];
        }

        const values = Object.fromEntries(header.map((key, index) => [key, parseScalar(tokens[index])]));
        const step = typeof values.Step === 'number' ? values.Step : null;
        const thermo: InterpretedThermoEvent = { type: 'thermo', step, values, raw: line };

        if(step === null){
            return [thermo];
        }

        return [thermo, { type: 'timestep', step, source: 'thermo' }];
    }
}
