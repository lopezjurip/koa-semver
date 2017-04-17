"use strict";

const Koa = require("koa");
const Router = require("koa-router");
const Semver = require("..");
const request = require("supertest");
const _ = require("lodash");

const handler = (message = "handler", final = true) =>
  (ctx, next) => {
    ctx.body = (ctx.body || []).concat(message);
    if (!final) return next();
  };

describe("Semver", () => {
  let app;
  let server;

  beforeEach(() => {
    app = new Koa();
    server = app.listen();
  });

  afterEach(async () => {
    await server.close();
  });

  it("should only accept functions as handlers", () => {
    const version = new Semver();
    expect(() => version.use(1)).toThrow();
    expect(() => version.use("string")).toThrow();
    expect(() => version.use({})).toThrow();

    version.use(_.noop);
    expect(version.modes).toHaveLength(1);
  });

  it("must set a first argument on handlers", () => {
    expect(() => Semver.handlers.param()).toThrow();
    expect(() => Semver.handlers.header()).toThrow();
    expect(() => Semver.handlers.query()).toThrow();
  });

  it("should clone the array of modes as a different reference", () => {
    const version = new Semver();
    version.use(_.noop);
    version.use(_.noop);

    const cloned = version.clone();
    expect(cloned).not.toBe(version);
    expect(cloned.modes).not.toBe(version.modes);
  });

  it("should match first middleware when no method is set up", async () => {
    const version = new Semver();

    app.use(version.match("^2.0.0", handler("2")));
    app.use(version.match("^2.1.0", handler("2")));
    app.use(version.match("^1.0.0", handler("1")));

    const response = await request(server).get("/");
    expect(response.body).toEqual(["2"]);
  });

  it("should allow continuations", async () => {
    const version = new Semver();
    version.use(Semver.handlers.header("X-Semver"));

    app.use(
      version.match("^2.0.0", (ctx, next) => {
        ctx.body = ["This is a middleware"];
        return next();
      })
    );
    app.use(version.match("^2.1.0", handler("2")));
    app.use(version.match("^1.0.0", handler("1")));

    const response = await request(server).get("/").set("X-Semver", "2.4.0");
    expect(response.body).toEqual(["This is a middleware", "2"]);
  });

  describe("koa-router@next", () => {
    it("should match routes via path", async () => {
      const router = new Router();
      const version = new Semver();
      version.use(Semver.handlers.param(":ver"));

      router.get("/:ver?/path", version.match("^4.0.0", handler("4")));
      router.get("/:ver/path", version.match("^2.0.0", handler("2")));
      router.get("/:ver/path", version.match("^1.0.0", handler("1")));

      app.use(router.routes());

      let response;
      response = await request(server).get("/1.4.0/path");
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(["1"]);

      response = await request(server).get("/2.4.0/path");
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(["2"]);

      response = await request(server).get("/3.4.0/path");
      expect(response.status).toEqual(404);
      expect(response.body).toEqual({});

      response = await request(server).get("/path");
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(["4"]);
    });

    it("should match routes via path with *", async () => {
      const router = new Router();
      const version = new Semver();
      version.use(Semver.handlers.param(":ver"));

      router.get("/:ver/path", version.match("^1.0.0", handler("1")));
      router.get("/:ver/path", version.match("*", handler("*")));

      app.use(router.routes());

      let response;
      response = await request(server).get("/2.4.0/path");
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(["*"]);

      response = await request(server).get("/1.4.0/path");
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(["1"]);

      response = await request(server).get("/0.4.0/path");
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(["*"]);
    });

    it("should match routes via headers", async () => {
      const router = new Router();
      const version = new Semver();
      version.use(Semver.handlers.header("X-Semver"));

      router.get("/path", version.match("^2.0.0", handler("2")));
      router.get("/path", version.match("^1.0.0", handler("1")));

      app.use(router.routes());

      let response;

      // No version on headers should return the latest (first one)
      response = await request(server).get("/path");
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(["2"]);

      response = await request(server).get("/path").set("X-Semver", "1.4.0");
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(["1"]);

      response = await request(server).get("/path").set("X-Semver", "2.4.0");
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(["2"]);

      response = await request(server).get("/path").set("X-Semver", "3.4.0");
      expect(response.status).toEqual(404);
      expect(response.body).toEqual({});
    });

    it("should match routes via query", async () => {
      const router = new Router();
      const version = new Semver();
      version.use(Semver.handlers.query("Semver"));

      router.get("/path", version.match("^2.0.0", handler("2")));
      router.get("/path", version.match("^1.0.0", handler("1")));

      app.use(router.routes());

      let response;

      // No version on query should return the latest (first one)
      response = await request(server).get("/path");
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(["2"]);

      response = await request(server).get("/path").query({ Semver: "1.4.0" });
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(["1"]);

      response = await request(server).get("/path").query({ Semver: "2.4.0" });
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(["2"]);

      response = await request(server).get("/path").query({ Semver: "3.4.0" });
      expect(response.status).toEqual(404);
      expect(response.body).toEqual({});
    });

    it("should respect hierarchy", async () => {
      const router = new Router();
      const version = new Semver();
      version.use(Semver.handlers.param(":Semver"));
      version.use(Semver.handlers.query("Semver"));
      version.use(Semver.handlers.header("Semver"));

      router.get("/:Semver/path", version.match("^2.0.0", handler("2")));
      router.get("/:Semver/path", version.match("^1.0.0", handler("1")));

      app.use(router.routes());

      let response;

      // No version on query should return the latest (first one)
      response = await request(server).get("/_/path");
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(["2"]);

      response = await request(server)
        .get("/_/path")
        .query({ Semver: "1.4.0" });
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(["1"]);

      response = await request(server).get("/_/path").set("Semver", "1.4.0");
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(["1"]);

      response = await request(server)
        .get("/1.0.0/path")
        .set("Semver", "2.4.0");
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(["1"]);
    });
  });
});
