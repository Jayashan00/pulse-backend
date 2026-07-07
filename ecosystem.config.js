// PM2 process file (used when running without Docker on EC2)
module.exports = {
  apps: [
    {
      name: 'pulse-api',
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      env: { NODE_ENV: 'production', PORT: 4000 },
    },
  ],
};
