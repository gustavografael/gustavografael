process.env.NETGUARDIAN_MODE ??= "local-agent";
process.env.PORT ??= "3737";
process.env.BIND_HOST ??= "127.0.0.1";

await import("./server.js");
