import type { VariableRow } from '@/modules/variables/domain/variables';
import { classNames } from '@/shared/utils/class-names';
import '@/modules/variables/components/VariableTable/variable-table.css';

interface VariableTableProps{
    rows: VariableRow[];
    editable: boolean;
    onOverride: (name: string, value: string) => void;
}

const VariableTable = ({ rows, editable, onOverride }: VariableTableProps) => (
    <table className='var-table'>
        <thead>
            <tr>
                <th>Name</th>
                <th>Style</th>
                <th className='end'>Current</th>
                <th className='end'>Next run</th>
            </tr>
        </thead>
        <tbody>
            {rows.map((row) => (
                <tr key={row.name}>
                    <td className='mono'>{row.name}</td>
                    <td className='muted'>{row.style}</td>
                    <td className='mono num end'>{row.current}</td>
                    <td className='end'>
                        {row.editable
                            ? (
                                <input
                                    className={classNames('var-input', row.override.trim() !== '' && 'over')}
                                    id={`var-${row.name}`}
                                    placeholder={row.current}
                                    value={row.override}
                                    spellCheck={false}
                                    disabled={!editable}
                                    aria-label={`Override ${row.name} for the next run`}
                                    onChange={(event) => onOverride(row.name, event.target.value)}
                                />
                            )
                            : <span className='muted'>—</span>}
                    </td>
                </tr>
            ))}
        </tbody>
    </table>
);

export default VariableTable;
