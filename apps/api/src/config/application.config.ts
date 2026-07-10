import { registerAs } from '@nestjs/config';

const DEFAULT_API_PORT = 3000;
const DEFAULT_CORS_ORIGIN = 'http://localhost:5173';
const DEFAULT_DATABASE_PATH = 'agent.sqlite';
const DEFAULT_SERVICE_NAME = 'agent-api';

/** Runtime values owned by the API process. */
export interface ApplicationConfig {
  corsOrigin: string;
  databasePath: string;
  databaseSynchronize: boolean;
  port: number;
  serviceName: string;
}

function parsePort(value: string | undefined): number {
  const port = Number(value ?? DEFAULT_API_PORT);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('API_PORT must be an integer between 1 and 65535.');
  }

  return port;
}

function parseBoolean(value: string | undefined): boolean {
  return value === 'true';
}

/** Provides validated, typed configuration to Nest modules. */
export const applicationConfig = registerAs(
  'application',
  (): ApplicationConfig => ({
    corsOrigin: process.env.CORS_ORIGIN ?? DEFAULT_CORS_ORIGIN,
    databasePath: process.env.DATABASE_PATH ?? DEFAULT_DATABASE_PATH,
    databaseSynchronize: parseBoolean(process.env.DATABASE_SYNCHRONIZE),
    port: parsePort(process.env.API_PORT),
    serviceName: process.env.API_SERVICE_NAME ?? DEFAULT_SERVICE_NAME,
  }),
);
