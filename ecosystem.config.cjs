module.exports = {
  apps: [
    {
      name: 'standup-intel-web',
      script: '.output/server/index.mjs',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/pm2/standup-intel-web-error.log',
      out_file: '/var/log/pm2/standup-intel-web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      restart_delay: 5000,
      max_restarts: 10,
    },
    {
      name: 'standup-intel-worker',
      script: 'server/worker.ts',
      interpreter: 'tsx',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/var/log/pm2/standup-intel-worker-error.log',
      out_file: '/var/log/pm2/standup-intel-worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      restart_delay: 5000,
      max_restarts: 10,
    },
  ],
}
