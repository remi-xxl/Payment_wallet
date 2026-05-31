import winston from "winston";
import DailyRotateFile from 'winston-daily-rotate-file';
import { env } from "./env.js";

const LOG_LEVEL = env.nodeEnv === 'production' ? 'info' : 'debug';

const devFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const defaultKeys = ['service', 'version', 'env'];
        const extraMeta = Object.keys(meta).filter(k => !defaultKeys.includes(k));
        const metaStr = extraMeta.length
            ? '\n' + JSON.stringify(meta, null, 2)
            : '';
        return `${timestamp} [${level}]: ${message}${metaStr}`;
    }),
    winston.format.colorize(),
);

const prodFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

const transports = [];

transports.push(
    new winston.transports.Console({
        format: env.nodeEnv === 'production' ? prodFormat : devFormat,
    })
);

if (env.nodeEnv === 'production') {
    transports.push(
        new DailyRotateFile({
            filename: 'logs/error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            maxFiles: '30d',
            maxSize: '20m',
            format: prodFormat,
        })
    );

    transports.push(
        new DailyRotateFile({
            filename: 'logs/combined-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxFiles: '14d',
            maxSize: '20m',
            format: prodFormat,
        })
    );
}

const logger = winston.createLogger({
    level: LOG_LEVEL,
    transports,
    defaultMeta: {
        service: 'banking-api',
        version: '1.0.0',
        env: env.nodeEnv,
    },
});

export default logger
