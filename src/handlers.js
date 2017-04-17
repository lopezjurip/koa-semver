const assert = require("assert");
const semver = require("semver");
const trimStart = require("lodash/trimStart");

exports.param = function param(name) {
  assert(name, "Must set 'name' argument on param handler");

  name = trimStart(name, ":");
  return ctx => {
    const value = ctx.params[name];
    return value ? semver.clean(value) : null;
  };
};

exports.header = function header(name) {
  assert(name, "Must set 'name' argument on header handler");

  return ctx => {
    const value = ctx.get(name);
    return value ? semver.clean(value) : null;
  };
};

exports.query = function query(name) {
  assert(name, "Must set 'name' argument on query handler");

  return ctx => {
    const value = ctx.query[name];
    return value ? semver.clean(value) : null;
  };
};
