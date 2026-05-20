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
    console.error('Failed to start server:', error);
    process.exit(1);
  });
