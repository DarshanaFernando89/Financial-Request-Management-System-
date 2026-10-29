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
    console.error('MongoDB Atlas unavailable. API startup stopped; local and demo fallback are disabled.');
    console.error(String(error?.message || error).replace(/mongodb(?:\+srv)?:\/\/\S+/g, '[redacted database URI]'));
    process.exit(1);
  });
