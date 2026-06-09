import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import app from './app.js';

connectDB()
  .then(() => {
    app.listen(env.port, () => {
      console.log(`FRMS API running on http://localhost:${env.port}`);
    });
  })
  .catch((error) => {
    app.locals.demoMode = true;
    console.warn('MongoDB unavailable. Starting FRMS API in demo mode.');
    console.warn(error?.message || error);
    app.listen(env.port, () => {
      console.log(`FRMS API demo mode running on http://localhost:${env.port}`);
    });
  });
