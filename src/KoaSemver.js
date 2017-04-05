const semver = require("semver");

class KoaSemver {
  constructor(modes = []) {
    this.modes = modes;
  }

  use(handler) {
    handler && this.modes.push(handler);
  }

  clone() {
    return new KoaSemver(this.modes);
  }

  match(target = "*", middleware) {
    return async (ctx, next) => {
      const requested = this.modes.reduce(
        (acc, handler) => acc || handler(ctx),
        null
      );

      const satisfies = !requested || semver.satisfies(requested, target);

      if (!ctx.state.version && middleware && satisfies) {
        ctx.state.version = {
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
