module.exports = {
  apps: [
    {
      name: 'coex-crm',
      cwd: '/www/wwwroot/coexsistemas.techvoz.com.br',
      script: '/www/wwwroot/coexsistemas.techvoz.com.br/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
    },
  ],
};
