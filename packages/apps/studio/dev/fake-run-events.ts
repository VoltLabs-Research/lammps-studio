import { Run } from '@lammps-studio/contracts/run/domain';
import { ThermoRow } from '@lammps-studio/lammps/log/domain';
import { applyChange, RunBatch, RunChange, RunRecord } from './fake-runs';
import { broadcast } from './fake-socket';

const broadcastThermo = ({ simulationId, number }: Run, rows: ThermoRow[]) => {
    for(const section of new Set(rows.map((row) => row.section))){
        const inSection = rows.filter((row) => row.section === section);
        broadcast({
            type: 'run:thermo',
            simulationId,
            runNumber: number,
            section,
            columns: inSection[0].columns,
            rows: inSection.map((row) => row.values)
        });
    }
};

const broadcastBatch = (run: Run, { lines, rows, frames }: RunBatch) => {
    const { simulationId, number: runNumber } = run;
    broadcast({ type: 'run:updated', run });
    if(lines.length > 0) broadcast({ type: 'run:log', simulationId, runNumber, lines });
    broadcastThermo(run, rows);
    frames.forEach((frame) => broadcast({ type: 'run:frame', simulationId, runNumber, frame }));
};

export const publishChange = (record: RunRecord, change: RunChange) => {
    const batch = applyChange(record, change);
    broadcastBatch(record.run, batch);
};

export const publishRecord = ({ run, reader, log, frames }: RunRecord) => {
    const rows = reader.sections.flatMap(({ section, columns, rows: values }) => values.map((row) => ({ section, columns, values: row })));
    broadcastBatch(run, { lines: log, rows, frames });
};
