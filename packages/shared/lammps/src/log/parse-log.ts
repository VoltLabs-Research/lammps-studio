import { splitLines } from '../shared/text';
import { ParsedLog } from './domain';
import LogReader from './LogReader';

export const parseLog = (text: string): ParsedLog => {
    const reader = new LogReader();
    const lines = splitLines(text).map((line) => reader.read(line).line);

    return {
        lines,
        sections: reader.sections,
        error: reader.error,
        warnings: reader.warnings,
        totalSteps: reader.totalSteps,
        lastStep: reader.lastStep
    };
};
