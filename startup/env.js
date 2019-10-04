const config = require("config");
const globalData = require('../components/globalData');

async function connect() {
  const port = config.get("server.port") || 3000;
  const url = await ngrok.connect(port);
  global.localtunnel = url;
  globalData.set('localtunnel', url);
}

module.exports = function () {
  if (process.env.COMPUTERNAME == "DEVCOM") {
    connect();
  }
};
