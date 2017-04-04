const semver = require("semver");
const trimStart = require("lodash/trimStart");

exports.param = function handlerParam(name = "version") {
  name = trimStart(name, ":");
  return ctx => {
    const value = ctx.params[name];
    return value ? semver.clean(value) : null;
  };
};

exports.header = function handlerHeader(name = "X-API-Version") {
  return ctx => {
    const value = ctx.get(name);
    return value ? semver.clean(value) : null;
  };
};

exports.query = function handlerQS(name = "semver") {
  return ctx => {
    const value = ctx.query[name];
    return value ? semver.clean(value) : null;
  };
};
