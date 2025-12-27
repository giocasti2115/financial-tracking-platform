import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './env.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { registerRoutes } from './routes/index.js';

const app = express();

const allowedOrigins = env.CLIENT_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOrigin =
  allowedOrigins.length === 0 || allowedOrigins.includes('*') ? true : allowedOrigins;

app.use(helmet());
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());
app.use(pinoHttp({ level: env.LOG_LEVEL }));

registerRoutes(app);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`API listening on port ${env.PORT}`);
});
