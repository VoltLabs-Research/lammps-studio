import createApp from '@/core/Application';
import { config } from '@/config';
import { AGENT_READY_PREFIX, AgentReadyMessage } from '@lammps-studio/contracts/desktop/bridge';
import { listen } from '@lammps-studio/readable/http/listen';

const announce = (url: string) => {
    const ready: AgentReadyMessage = {
        url,
        token: config.token,
        version: config.version
    };

    process.stdout.write(`${AGENT_READY_PREFIX}${JSON.stringify(ready)}\n`);
};

listen(createApp(), announce);
