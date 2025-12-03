// Artillery load test helper functions
module.exports = {
  logHeaders: function (requestParams, context, ee, next) {
    console.log("Testing TrossApp API endpoints...");
    return next();
  },
};
