# Koa Semver

**Work in progress**

Match middleware with Semantic Versioning.

## Installation

```sh
yarn add koa-semver
```

## Example Usage

```js
"use strict";

const Koa = require("koa");
const Router = require("koa-router");
const logger = require("koa-logger");
const semver = require("koa-semver");

const app = new Koa();
app.use(logger());

const version = semver();
version.use(semver.param(":version"));

const router = new Router();

router.get("/:version/users", version.match("~1.2.0", ctx => {
  ctx.body = {
    users: {
      scoped: [],
    },
  };
}));

router.get("/:version/users", version.match("^1.0.0", ctx => {
  ctx.body = {
    users: [],
  };
}));

app.use(router.routes());

app.listen(3000);
```

## Testing

Run Jest test suite with:

```sh
yarn test
```
