const { Server } = require("socket.io");
const { createClient } = require("redis");
const { createAdapter } = require("@socket.io/redis-adapter");
const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const JWT_SECRET = process.env.JWT_SECRET || "INSECURE_DEV_SECRET_CHANGE_IN_PRODUCTION";
const REDIS_URL = process.env.REDIS_URL || "redis://redis:6379";

let io;
let redisClient;
let subClient;

// Lock TTL in seconds (15 minutes)
const LOCK_TTL = 15 * 60;

async function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*", // Adjust in production
      methods: ["GET", "POST"],
    },
    path: "/socket.io",
  });

  // Redis Adapter Setup
  try {
    redisClient = createClient({ url: REDIS_URL });
    subClient = redisClient.duplicate();

    await Promise.all([redisClient.connect(), subClient.connect()]);

    io.adapter(createAdapter(redisClient, subClient));
    console.log("Redis Adapter initialized for Socket.io");
  } catch (err) {
    console.error("Redis connection failed, falling back to in-memory adapter:", err);
  }

  // Middleware: Authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) return next(new Error("Authentication error: Invalid token"));
      socket.user = decoded;
      next();
    });
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.user.username} (${socket.id})`);

    socket.on("join_room", (room) => {
      socket.join(room);
    });

    // Client requesting a lock
    socket.on("lock:acquire", async ({ resourceType, resourceId }, callback) => {
      try {
        const result = await acquireLock(resourceType, resourceId, socket.user);
        callback(result); // { success: true/false, lockedBy: ... }
      } catch (err) {
        console.error("Lock acquire error:", err);
        callback({ success: false, error: "Internal server error" });
      }
    });

    // Client releasing a lock
    socket.on("lock:release", async ({ resourceType, resourceId }, callback) => {
      try {
        await releaseLock(resourceType, resourceId, socket.user);
        callback({ success: true });
      } catch (err) {
        console.error("Lock release error:", err);
        callback({ success: false });
      }
    });

    // Check lock status
    socket.on("lock:check", async ({ resourceType, resourceId }, callback) => {
      try {
        const lock = await checkLock(resourceType, resourceId);
        callback(lock);
      } catch (err) {
        callback(null);
      }
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.user.username}`);
      // Note: Auto-release on disconnect requires tracking locks per socket.
      // For simplicity/robustness, we rely on TTL or explicit release.
      // Optimistic locking strategy: if they disconnect, the lock expires in 15 mins.
    });
  });

  return io;
}

// Lock Key Helper
const getLockKey = (type, id) => `lock:${type}:${id}`;

/**
 * Attempts to acquire a lock for a resource.
 * Returns { success: boolean, lockedBy: object }
 */
async function acquireLock(resourceType, resourceId, user) {
  const key = getLockKey(resourceType, resourceId);
  const value = JSON.stringify({
    userId: user.id,
    username: user.username,
    acquiredAt: Date.now(),
  });

  if (!redisClient) return { success: true, lockedBy: null }; // Fallback if no Redis

  // SET key value NX EX ttl
  // NX: Only set if not exists
  // EX: Expire in seconds
  const result = await redisClient.set(key, value, { NX: true, EX: LOCK_TTL });

  if (result === "OK") {
    // Lock acquired
    // Broadcast lock event so other clients can update UI immediately
    io.emit(`lock:update:${resourceType}:${resourceId}`, { isLocked: true, lockedBy: user.username });
    return { success: true, lockedBy: user.username };
  } else {
    // Already locked, get current owner
    const currentLockData = await redisClient.get(key);
    let lockedBy = "Unknown";
    if (currentLockData) {
      try {
        const parsed = JSON.parse(currentLockData);
        lockedBy = parsed.username;
        // If current user already holds lock (e.g. refresh/reconnect), extend it?
        if (parsed.userId === user.id) {
            // Refresh TTL
            await redisClient.expire(key, LOCK_TTL);
            return { success: true, lockedBy: user.username };
        }
      } catch (e) {}
    }
    return { success: false, lockedBy };
  }
}

/**
 * Releases a lock if held by the user (or if forced).
 */
async function releaseLock(resourceType, resourceId, user) {
  const key = getLockKey(resourceType, resourceId);

  if (!redisClient) return;

  const currentLockData = await redisClient.get(key);
  if (!currentLockData) return; // Already free

  try {
    const parsed = JSON.parse(currentLockData);
    // Only allow owner to release
    if (parsed.userId === user.id) {
      await redisClient.del(key);
      io.emit(`lock:update:${resourceType}:${resourceId}`, { isLocked: false, lockedBy: null });
    }
  } catch (e) {
    // If corrupt, delete it
    await redisClient.del(key);
  }
}

/**
 * Checks if a resource is locked.
 */
async function checkLock(resourceType, resourceId) {
    const key = getLockKey(resourceType, resourceId);
    if (!redisClient) return { isLocked: false };

    const data = await redisClient.get(key);
    if (data) {
        try {
            const parsed = JSON.parse(data);
            return { isLocked: true, lockedBy: parsed.username, acquiredAt: parsed.acquiredAt };
        } catch (e) {
            return { isLocked: false };
        }
    }
    return { isLocked: false };
}

/**
 * Emits a global event to all connected clients.
 * Used for data sync.
 */
function emitEvent(eventName, data) {
  if (io) {
    io.emit(eventName, data);
  }
}

module.exports = {
  initializeSocket,
  emitEvent,
  acquireLock,
  releaseLock,
  checkLock
};
