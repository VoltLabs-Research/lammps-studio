const LINE_BREAK = /\r\n|\r|\n/;
const ESCAPE = String.fromCharCode(0x1b);
const ANSI_ESCAPE = new RegExp(`${ESCAPE}\\[[0-9;]*[A-Za-z]`, 'g');

export interface DockerBuildEvent{
    stream?: string;
    status?: string;
    id?: string;
    progressDetail?: DockerProgressDetail;
    error?: string;
}

export interface DockerProgressDetail{
    current?: number;
    total?: number;
}

const isTransferTick = (event: DockerBuildEvent): boolean => {
    return event.progressDetail?.current !== undefined;
};

export default class DockerBuildStream{
    error: string | null = null;
    #pending = '';

    constructor(private readonly onLine: (line: string) => void){}

    push(event: DockerBuildEvent){
        if(typeof event.error === 'string'){
            this.error = event.error;
            this.onLine(event.error);
            return;
        }

        if(typeof event.stream === 'string'){
            this.pushText(event.stream);
            return;
        }

        if(typeof event.status === 'string' && !isTransferTick(event)){
            this.onLine(event.id ? `${event.status} ${event.id}` : event.status);
        }
    }

    end(){
        if(this.#pending.length > 0){
            this.onLine(this.#pending);
        }

        this.#pending = '';
    }

    private pushText(text: string){
        const parts = `${this.#pending}${text.replace(ANSI_ESCAPE, '')}`.split(LINE_BREAK);
        this.#pending = parts.pop() ?? '';

        for(const line of parts){
            if(line.trim().length > 0){
                this.onLine(line.trimEnd());
            }
        }
    }
}
