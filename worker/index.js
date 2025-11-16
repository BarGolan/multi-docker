const keys = require("./keys");
const redis = require("redis");

const redisClient = redis.createClient({
  url: `redis://${keys.redisHost}:${keys.redisPort}`,
  socket: {
    reconnectStrategy: () => 1000
  }
});

const sub = redisClient.duplicate();

function fib(index) {
  if (index < 2) return 1;
  return fib(index - 1) + fib(index - 2);
}

const startWorker = async () => {
  try {
    // 1. Connect BOTH clients
    await redisClient.connect();
    await sub.connect();
    console.log("Worker connected to Redis");

    // 2. Await the subscription and pass the listener directly
    // Note: The listener arguments are (message, channel)
    await sub.subscribe("insert", (message, channel) => {
      const value = fib(parseInt(message));
      console.log("Calculated fib:", value);

      // Use the non-subscribing client to set the value
      redisClient.hSet("values", message, value)
        .catch(err => console.error("Redis HSET Error:", err));
    });

    console.log("Worker is subscribed to 'insert' channel");

  } catch (err) {
    console.error("Worker failed to start:", err);
  }
};

// Add error listeners
redisClient.on('error', err => console.log('Redis Client Error', err));
sub.on('error', err => console.log('Redis Subscriber Error', err));

// Run the worker
startWorker();