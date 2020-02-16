const User = require('../models/User');

module.exports = function(role = 'admin') {
  try {
    let user = User.fromJson({
      id: 1,
      username: 'username',
      name: 'name',
      password: 'password',
      email: 'email@test.com',
      role
    });
    authToken = user.getAuthToken();
    return authToken;
  } catch (ex) {
    console.log(ex);
    throw ex;
  }
};
