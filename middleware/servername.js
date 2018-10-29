const globalData = require('../components/globalData')

module.exports = function (req, res, next) {
  globalData.set('server', `${req.protocol}://${req.get('Host')}`);
  next();
}