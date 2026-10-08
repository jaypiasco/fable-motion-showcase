module.exports = {
  apps: [
    {
      name: "ai-story-daemon",
      script: "orchestrator.py",
      args: "daemon",
      interpreter: "python",
      cwd: __dirname,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      restart_delay: 5000,
      env: {
        PYTHONUNBUFFERED: "1",
        NODE_ENV: "production"
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "./logs/pm2_error.log",
      out_file: "./logs/pm2_output.log",
      merge_logs: true
    }
  ]
};
