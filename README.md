# koa-semver

[![npm](https://img.shields.io/npm/v/npm.svg)](https://npmjs.org/package/koa-semver) [![NPM Downloads](https://img.shields.io/npm/dm/koa-semver.svg?style=flat)](https://npmjs.org/package/koa-semver) [![Node.js Version](https://img.shields.io/node/v/koa-semver.svg?style=flat)](http://nodejs.org/download/) [![Build Status](http://img.shields.io/travis/mrpatiwi/koa-semver.svg?style=flat)](http://travis-ci.org/mrpatiwi/koa-semver)

Match middleware with [Semantic Versioning](http://semver.org/).

Built with [npm/node-semver](https://github.com/npm/node-semver) to match familiar `npm` style dependency syntax and usage, but for middleware and routes.

**Requisites:**

* [Node.js](https://nodejs.org) >= 7.6.0
* [Koa](https://github.com/koajs/koa) >= 2.0.0

## Installation

```sh
npm install --save koa-semver

# with yarn:
yarn add koa-semver
```

## Usage

`koa-semver` allows multiple usage options, but it is strongly recommended to use with [`koa-router`](https://github.com/alexmingoia/koa-router/tree/master/).

### Basic Versioning

A sample Koa server would be:

```js
"use strict";

const Koa = require("koa");
const Router = require("koa-router");
const Semver = require("koa-semver");

const app = new Koa();
const router = new Router();

// Add handlers by priority
// (Descending order)
const ver = new Semver([
  Semver.handlers.header("X-Semver"),
  Semver.handlers.param(":version"),
  Semver.handlers.query("version"),
]);

// Newer middleware or routes should be placed on top
// (Descending order)
router.get("/:version/users", ver.match("~2.10.0", ctx => {
  ctx.body = { // Latest
    users: {
      administrators: [],
      clients: [],
    },
  };
}));

router.get("/:version/users", ver.match("^1.2.0", ctx => {
  ctx.body = { // Legacy
    users: []
  };
}));

app.use(router.routes());

app.listen(3000);
```

Client side usage:

```sh
# Latest version
$ curl http://localhost:3000/_/users
$ curl -H "X-Semver: 2.10.1" http://localhost:3000/_/users
{
    "users": {
        "administrators": [],
        "clients": []
    }
}

# Latest version (headers has more priority than route param)
$ curl -H "X-Semver: 2.10.1" http://localhost:3000/1.2.5/users
{
    "users": {
        "administrators": [],
        "clients": []
    }
}
```

```sh
# Specific version
$ curl http://localhost:3000/1.3.0/users
$ curl http://localhost:3000/_/users?version=1.4.0
{
    "users": []
}
```

```sh
# Unknown version
$ curl http://localhost:3000/3.0.0/users
$ curl http://localhost:3000/0.1.0/users
Not Found
```

### Semver state variable

It is possible to know about the requested and matching versions:

```js
router.get("/:version/users", ver.match("^1.2.0", ctx => {
  ctx.body = ctx.state.semver;
}));
```

### Create a matcher

Sometimes we want to reuse the matching version, so we can:

```js
const ver = new Semver();
ver.use(Semver.handlers.header("X-Semver"));

const matcher = ver.matcher("^1.0.0");

const router = new Router();
router.get("/users", matcher(async ctx => {
  // ...
}));
router.post("/users/:id/comments", matcher(async ctx => {
  // ...
}));
```

Another way is:

```js
const app = new Koa();

const ver = new Semver();
ver.use(Semver.handlers.header("X-Semver"));

const router = new Router();
router.get("/users", async ctx => {
  // ...
});
router.post("/users/:id/comments", async ctx => {
  // ...
});

app.use(ver.match("^1.0.0", router.routes()));
```

### Multiple matching

It is responsibility of the developer to stop the middleware propagation. So it is possible to match multiples routes or add conditional middleware using `koa-semver`;

```js
const app = new Koa();
const router = new Router();
const ver = new Semver();
ver.use(Semver.handlers.header("X-Semver"));

app.use(ver.match("1.x || >=2.5.0 || 5.0.0 - 7.2.3", (ctx, next) => {
  // Patch some buggy versions
  ctx.state.something = true;
  ctx.body = [];
  return next(); // <- Continue middleware chain
}));

router.get("/endpoint", ver.match("^1.2.0", async (ctx, next) => {
  ctx.body.append("Hello!");
  await next(); // <- Continue middleware chain
}));

router.get("/endpoint", ver.match("^1.1.0", async ctx => {
  ctx.body.append("World!");
  // We broke the chain
}));

router.get("/endpoint", ver.match("^1.0.1", async ctx => {
  // This would never match
}));

// ...

app.use(router.routes());
```

In this case a `GET` request to `/endpoint` with `X-Semver: 1.2.0` will match the first two routes and will return:

```sh
["Hello!", "World!"]
```

## Testing

Run Jest test suite with:

```sh
yarn test

# With coverage
yarn test -- --coverage

# Watch for changes
yarn test -- --watch
```
