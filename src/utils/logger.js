/**
 * logger.js — Structured logging via Winston.
 *
 * Outputs JSON in production, colorized text in development.
 * Writes error.log and combined.log in production.
 */

import { createLogger, format, transports } from "winston";
import { env } from "../config/env.js";

const { combine, timestamp, errors, json, colorize, printf } = format;

// Dev format: colored + readable
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: "HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, ...meta }) => {
    const extra = Object.keys(meta).length ? " " + JSON.stringify(meta) : "";
    return `${timestamp} [${level}] ${message}${extra}`;
  })
);

// Prod format: structured JSON for log aggregators
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const logger = createLogger({
  level: env.LOG_LEVEL || "info",
  format: env.IS_PROD ? prodFormat : devFormat,
  defaultMeta: { service: "forgesites-api" },
  transports: [
    new transports.Console(),
    ...(env.IS_PROD ? [
      new transports.File({ filename: "logs/error.log",    level: "error",  maxsize: 10_485_760, maxFiles: 5 }),
      new transports.File({ filename: "logs/combined.log",                  maxsize: 10_485_760, maxFiles: 10 }),
    ] : []),
  ],
  exceptionHandlers: [
    new transports.Console(),
    ...(env.IS_PROD ? [new transports.File({ filename: "logs/exceptions.log" })] : []),
  ],
  rejectionHandlers: [
    new transports.Console(),
    ...(env.IS_PROD ? [new transports.File({ filename: "logs/rejections.log" })] : []),
  ],
});

export default logger;
