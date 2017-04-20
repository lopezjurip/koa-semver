const semver = require("semver");
const isFunction = require("lodash/isFunction");

const handlers = require("./handlers");

class KoaSemver {
  static test(requested, target) {
    return !requested || semver.satisfies(requested, target);
  }

  constructor(modes = []) {
    this.modes = modes;
  }

  use(handler) {
    if (isFunction(handler)) {
      this.modes.push(handler);
    } else {
      throw new Error("koa-semver `use` must receive a function as argument");
    }
  }

  clone() {
    return new KoaSemver([...this.modes]);
  }

  matcher(target = "*") {
    return middleware => (ctx, next) => {
      const requested = this.modes.reduce(
        (acc, handler) => acc || handler(ctx),
        null
      );

      if (middleware && KoaSemver.test(requested, target)) {
        ctx.state.semver = {
          target,
          requested,
        };
        return middleware(ctx, next);
      } else {
        return next();
      }
    };
  }

  match(target = "*", middleware = null) {
    return this.matcher(target)(middleware);
  }
}

module.exports = KoaSemver;
module.exports.handlers = handlers;
