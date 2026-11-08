import { PassThrough, Readable } from 'node:stream';
import { finished } from 'node:stream/promises';
import Docker from 'dockerode';
import { ContainerHandle } from '../../ports/ContainerManagerPort';
import type { Logger } from '../../ports/Logger';
import { LogStreamHandle, LogStreamHandlers, LogStreamerPort } from '../../ports/LogStreamerPort';
import { toError } from '../../domain/shared/toError';
import DockerContainerResolver from './DockerContainerResolver';

const LINE_BREAK = /\r?\n/;

const splitLines = (stream: PassThrough, onLine: (line: string) => void) => {
    let pending = '';

    stream.setEncoding('utf8');
    stream.on('data', (chunk: string) => {
        const parts = `${pending}${chunk}`.split(LINE_BREAK);
        pending = parts.pop() ?? '';
        parts.forEach(onLine);
    });
    stream.on('end', () => {
        if(pending.length > 0){
            onLine(pending);
        }
    });
};

export default class DockerLogStreamer implements LogStreamerPort{
    constructor(
        private readonly docker: Docker,
        private readonly containerResolver: DockerContainerResolver,
        private readonly logger: Logger
    ){}

    async stream(container: ContainerHandle, handlers: LogStreamHandlers): Promise<LogStreamHandle>{
        const attached = await this.containerResolver.resolve(container).attach({
            stream: true,
            stdout: true,
            stderr: true,
            logs: true
        });

        const stdout = new PassThrough();
        const stderr = new PassThrough();
        splitLines(stdout, handlers.onStdout);
        splitLines(stderr, handlers.onStderr);
        this.docker.modem.demuxStream(attached, stdout, stderr);

        attached.on('error', (error: unknown) => {
            this.logger.error(`Log stream error for container ${container.id}`, { error: String(error) });
            handlers.onError(toError(error));
        });

        const sourceEnded = new Promise<void>((resolve) => {
            attached.once('end', resolve);
            attached.once('close', resolve);
        });

        const ended = (async () => {
            await sourceEnded;
            stdout.end();
            stderr.end();
            await Promise.all([finished(stdout), finished(stderr)]);
        })();

        return {
            ended,
            close: async () => {
                if(attached instanceof Readable){
                    attached.destroy();
                }

                await ended;
            }
        };
    }
}
