import pino, { Logger as PinoBaseLogger } from 'pino';
import { LogContext, Logger } from '../../ports/Logger';

export default class PinoLogger implements Logger{
    private readonly logger: PinoBaseLogger;

    constructor(logger?: PinoBaseLogger){
        this.logger = logger ?? pino({ name: 'lammps-runtime' });
    }

    debug(message: string, context?: LogContext){
        this.logger.debug(context ?? {}, message);
    }

    info(message: string, context?: LogContext){
        this.logger.info(context ?? {}, message);
    }

    warn(message: string, context?: LogContext){
        this.logger.warn(context ?? {}, message);
    }

    error(message: string, context?: LogContext){
        this.logger.error(context ?? {}, message);
    }

    child(context: LogContext): Logger{
        return new PinoLogger(this.logger.child(context));
    }
}
