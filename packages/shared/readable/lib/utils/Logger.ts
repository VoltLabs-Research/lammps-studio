import { LogContext, LoggerOptions, LogLevel, LogMethod } from '../contracts/logging';
import pino, { Logger as PinoLogger } from 'pino';

const STDOUT = 1;

const toStdout = (level: LogLevel): PinoLogger => pino({ level }, pino.destination({ dest: STDOUT, sync: true }));

export class Logger{
    #pino: PinoLogger;

    constructor(instance?: PinoLogger){
        this.#pino = instance ?? toStdout('info');
    }

    configure(options: LoggerOptions){
        this.#pino = toStdout(options.level);
    }

    child(bindings: LogContext): Logger{
        return new Logger(this.#pino.child(bindings));
    }

    #log(level: LogMethod, message: string, context?: LogContext){
        this.#pino[level](context ?? {}, message);
    }

    debug(message: string, context?: LogContext){
        this.#log('debug', message, context);
    }

    info(message: string, context?: LogContext){
        this.#log('info', message, context);
    }

    warn(message: string, context?: LogContext){
        this.#log('warn', message, context);
    }

    error(message: string, error?: unknown, context?: LogContext){
        this.#pino.error({ ...context, err: error }, message);
    }

    get raw(): PinoLogger{
        return this.#pino;
    }
}

export const logger = new Logger();
