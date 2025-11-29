const keys = require("./keys");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const { Pool } = require("pg");

const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort,
  ssl:
    process.env.NODE_ENV !== "production"
      ? false
      : { rejectUnauthorized: false },
});

pgClient.on("connect", (client) => {
  client
    .query("CREATE TABLE IF NOT EXISTS values (number INT)")
    .then(() => {
      console.log("Postgres table 'values' is ready");
    })
    .catch((err) => console.error("Failed to connect to postress", err));
});

const redis = require("redis");
const redisClient = redis.createClient({
  // THIS IS THE V4 FIX
  url: `redis://${keys.redisHost}:${keys.redisPort}`,
  socket: {
    // This is the v4 replacement for retry_strategy
    reconnectStrategy: () => 1000,
  },
});

const redisPublisher = redisClient.duplicate();
app.get("/", (req, res) => {
  res.send("Hi");
});

app.get("/values/all", async (req, res) => {
  const values = await pgClient.query("SELECT * FROM values");
  res.send(values.rows);
});

app.get("/values/current", async (req, res) => {
  try {
    const foundValues = await redisClient.hGetAll("values");
    res.send(foundValues || {});
  } catch (err) {
    console.error("Redis hGetAll error:", err);
    res.status(500).send(err);
  }
});

app.post("/values", async (req, res) => {
  const index = req.body.index;
  if (parseInt(index) > 40) return res.status(422).send("Index too high");

  redisClient.hSet("values", index, "Nothing yet!");
  redisPublisher.publish("insert", index);

  pgClient.query("INSERT INTO values(number) VALUES($1)", [index]);

  res.send({ working: true });
});

const startApp = async () => {
  try {
    // 1. Connect to Redis FIRST
    console.log("Trying to connect to Redis Client...");
    await redisClient.connect();
    console.log("Redis Client connected");
    console.log("Trying to connect to Redis Publisher...");
    await redisPublisher.connect();
    console.log("Redis Publisher connected");

    // 2. NOW that dependencies are ready, start the server
    app.listen(5000, () => {
      console.log("Listening on port 5000");
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1); // Exit if we can't connect
  }
};

startApp();
