// Starts the API server (port 3001) and the Vite dev server (port 3000) together.
import { spawn } from 'node:child_process';

const procs = [
  spawn(process.execPath, ['server/index.js'], {
    stdio: 'inherit',
    env: { ...process.env, PORT: process.env.API_PORT || '3001', NODE_ENV: 'development' },
  }),
  spawn('npx vite --port=3000 --host=0.0.0.0', { stdio: 'inherit', shell: true, env: process.env }),
];

const stop = () => procs.forEach((p) => p.kill());
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
procs.forEach((p) => p.on('exit', (code) => {
  stop();
  process.exit(code ?? 0);
}));
