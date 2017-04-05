"use strict";

const Koa = require("koa");
const request = require("supertest");
const semver = require("..");

const handler = (message = "handler") =>
  (ctx, next) => {
    ctx.body = (ctx.body || []).concat(message);
    return next();
  };

// const handlerEnd = (message = "end") =>
//   ctx => {
//     ctx.body = (ctx.body || []).concat(message);
//   };

describe("semver", () => {
  let app;
  let server;

  beforeEach(() => {
    app = new Koa();
    server = app.listen();
  });

  afterEach(async () => {
    await server.close();
  });

  it("should match first middleware when no method is set up", async () => {
    const version = semver();

    app.use(version.match("^2.0.0", handler("1")));
    app.use(version.match("^1.0.0", handler("2")));

    const { body } = await request(server).get("/");
    expect(body).toEqual(["1"]);
  });
});
