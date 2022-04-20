const instance_var = "INSTANCE_ID"; // Fixes node-config issue
// const env = {
//   NODE_ENV: "production",
// };

module.exports = {
  apps: [
    {
      name: "tickets-api-dev",
      script: "./node_modules/ts-node/dist/bin.js",
      args: "./server.js",
      cwd: "./",
      instance_var,
      // env,
      watch: false,
    },
  ],
};
