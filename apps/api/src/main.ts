import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import type { HttpLogger, Options as PinoHttpOptions } from 'pino-http';
import { env } from './env.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { registerRoutes } from './routes/index.js';

const app = express();
app.set('etag', false);

const normalizeOrigin = (origin: string) => origin.replace(/\/$/, '');

const allowedOrigins = env.CLIENT_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map(normalizeOrigin);

const allowAllOrigins = allowedOrigins.length === 0 || allowedOrigins.includes('*');
const isDevelopment = env.NODE_ENV !== 'production';

const corsOptions: cors.CorsOptions = {
  credentials: true,
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = normalizeOrigin(origin);

    if (allowAllOrigins || allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    if (isDevelopment && normalizedOrigin.startsWith('http://localhost:')) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  }
};

app.use(helmet());
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
const createHttpLogger = pinoHttp as unknown as (opts?: PinoHttpOptions) => HttpLogger;

app.use(createHttpLogger({ level: env.LOG_LEVEL }));

registerRoutes(app);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`API listening on port ${env.PORT}`);
});
