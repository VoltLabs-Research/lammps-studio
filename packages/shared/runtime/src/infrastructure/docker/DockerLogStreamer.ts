import { PassThrough, Readable } from 'node:stream';
import Docker from 'dockerode';
import { ContainerHandle } from '../../ports/ContainerManagerPort';
import type { Logger } from '../../ports/Logger';
import { LogStreamHandle, LogStreamHandlers, LogStreamerPort } from '../../ports/LogStreamerPort';
import { toError } from '../../domain/shared/toError';
import DockerContainerResolver from './DockerContainerResolver';

const LINE_BREAK = /\r?\n/;

const pipeLines = (
    stream: NodeJS.ReadableStream,
    handler: (line: string) => void | Promise<void>,
    onError: (error: Error) => void | Promise<void>
) => {
    let buffer = '';
    const deliver = (line: string) => {
        void Promise.resolve(handler(line)).catch((error: unknown) => onError(toError(error)));
    };

    stream.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        const parts = buffer.split(LINE_BREAK);
        buffer = parts.pop() ?? '';

        for(const line of parts){
            if(line.length > 0) deliver(line);
        }
    });

    stream.on('end', () => {
        if(buffer.length > 0) deliver(buffer);
    });

    stream.on('error', (error: unknown) => {
        void onError(toError(error));
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

        this.docker.modem.demuxStream(attached, stdout, stderr);
        pipeLines(stdout, handlers.onStdout, handlers.onError);
        pipeLines(stderr, handlers.onStderr, handlers.onError);

        attached.on('error', (error: unknown) => {
            this.logger.error(`Log stream error for container ${container.id}`, { error: String(error) });
            void handlers.onError(toError(error));
        });

        return {
            close: async () => {
                if(attached instanceof Readable){
                    attached.destroy();
                }

                stdout.destroy();
                stderr.destroy();
            }
        };
    }
}
