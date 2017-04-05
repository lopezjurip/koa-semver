const semver = require("semver");
const isFunction = require("lodash/isFunction");

class KoaSemver {
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

  match(target = "*", middleware = null) {
    return async (ctx, next) => {
      const requested = this.modes.reduce(
        (acc, handler) => acc || handler(ctx),
        null
      );

      const satisfies = !requested || semver.satisfies(requested, target);

      if (!ctx.state.semver && middleware && satisfies) {
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
}

module.exports = KoaSemver;
