import { LogContext, LoggerOptions, LogMethod } from '../contracts/logging';
import pino, { Logger as PinoLogger } from 'pino';

const STDERR = 2;

export class Logger{
    #pino: PinoLogger;

    constructor(instance?: PinoLogger){
        this.#pino = instance ?? pino({ level: 'info' }, pino.destination(STDERR));
    }

    configure(options: LoggerOptions){
        this.#pino = pino({ level: options.level }, pino.destination(STDERR));
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
