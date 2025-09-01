const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const customerdata = {
  email: "lingojikarthikchary@gmail.com",
  password: "123456789",
  roverid: "rover@123",
};

const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const clients = {};              
const controllerToRover = {};    
const roverToController = {};    

wss.on("connection", (ws) => {
  console.log("🔗 WebSocket client connected");

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);
      // console.log("📩 Received:", data);

      if (data.type === "register") {
        clients[data.uniqueId] = ws;
        console.log("Registered ID:", data.uniqueId);
      }

      else if (data.type === "connectwithrover") {
        const { email, password, uniqueId, roverid } = data;
        if (
          email === customerdata.email &&
          password === customerdata.password &&
          roverid === customerdata.roverid
        ) {
          controllerToRover[uniqueId] = roverid;
          roverToController[roverid] = uniqueId;
          ws.send(JSON.stringify({ type: "connectedrover", message: "success" }));
          console.log(`✅ Rover ${roverid} linked with controller ${uniqueId}`);
        } else {
          ws.send(JSON.stringify({ type: "connectedfailure", message: "failure" }));
        }
      }
      else if (data.type === "gps") {
        console.log("📍 GPS data received:", data);
  const roverid = data.uniqueId;
  const controllerid = roverToController[roverid];

  if (controllerid && clients[controllerid]) {
    clients[controllerid].send(JSON.stringify({
      type: "gps_update",
      roverid,
      data: data.data,
    }));
    console.log(`📡 Forwarded GPS from ${roverid} → ${controllerid}`);
  }
}


      else if (data.type === "send_instruction") {
  const { fromId, throttle, steering, command } = data;
  const roverid = controllerToRover[fromId];

  if (roverid && clients[roverid]) {
    // Forward throttle/steering if present, else forward discrete command
    const payload = { type: "receive_instruction" };
    if (typeof throttle !== "undefined" && typeof steering !== "undefined") {
      payload.throttle = throttle;
      payload.steering = steering;
    }
    if (command) payload.command = command;

    clients[roverid].send(JSON.stringify(payload));
    console.log(`➡️ Forwarded instruction from ${fromId} → ${roverid}`, payload);
  } else {
    console.log(`⚠️ No rover linked for ${fromId}`);
  }
}

    } catch (err) {
      console.error("❌ Error parsing message:", err);
    }
  });

  ws.on("close", () => {
    console.log("❌ Client disconnected");
    for (let id in clients) {
      if (clients[id] === ws) delete clients[id];
    }
  });
});

server.listen(3000, () => {
  console.log("✅ Server running on http://localhost:3000");
  console.log("✅ WebSocket running on ws://localhost:3000");
});
