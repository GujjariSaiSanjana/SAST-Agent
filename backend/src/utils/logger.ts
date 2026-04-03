import winston from 'winston';
import path from 'path';

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

const devFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${ts} [${level}]: ${stack || message}${metaStr}`;
});

const transports: winston.transport[] = [
    new winston.transports.Console({
        format:
            process.env.NODE_ENV === 'production'
                ? combine(timestamp(), errors({ stack: true }), json())
                : combine(
                    colorize({ all: true }),
                    timestamp({ format: 'HH:mm:ss' }),
                    errors({ stack: true }),
                    devFormat
                ),
    }),
];

if (process.env.NODE_ENV === 'production') {
    transports.push(
        new winston.transports.File({
            filename: path.join('logs', 'error.log'),
            level: 'error',
            format: combine(timestamp(), errors({ stack: true }), json()),
        }),
        new winston.transports.File({
            filename: path.join('logs', 'combined.log'),
            format: combine(timestamp(), errors({ stack: true }), json()),
        })
    );
}

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    transports,
    exceptionHandlers: [
        new winston.transports.Console(),
    ],
    rejectionHandlers: [
        new winston.transports.Console(),
    ],
});
