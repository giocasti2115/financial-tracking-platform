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

const allowAllOrigins = allowedOrigins.length === 0 || allowedOrigins.includes('*');
const isDevelopment = env.NODE_ENV !== 'production';

const corsOptions: cors.CorsOptions = {
  credentials: true,
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (allowAllOrigins || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    if (isDevelopment && origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  }
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(pinoHttp({ level: env.LOG_LEVEL }));

registerRoutes(app);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`API listening on port ${env.PORT}`);
});
