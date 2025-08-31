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

// Simple HTTP route (for Render health check)
app.get("/", (req, res) => {
  res.send("✅ Rover WebSocket Server Running");
});

// Create HTTP + WebSocket server
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: "/" }); // 👈 path is important for Render

// Stores
const clients = {};              
const controllerToRover = {};    
const roverToController = {};    

wss.on("connection", (ws, req) => {
  console.log("🔗 WebSocket client connected");

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);
      console.log("📩 Received:", data);

      // 1. Register
      if (data.type === "register") {
        clients[data.uniqueId] = ws;
        console.log("Registered ID:", data.uniqueId);
      }

      // 2. Controller connects to Rover
      else if (data.type === "connectwithrover") {
        const { email, password, uniqueId, roverid } = data;
        if (
          email === customerdata.email &&
          password === customerdata.password &&
          roverid === customerdata.roverid
        ) {
          controllerToRover[uniqueId] = roverid;
          roverToController[roverid] = uniqueId;
          ws.send(
            JSON.stringify({ type: "connectedrover", message: "success" })
          );
          console.log(`✅ Rover ${roverid} linked with controller ${uniqueId}`);
        } else {
          ws.send(
            JSON.stringify({ type: "connectedfailure", message: "failure" })
          );
        }
      }

      // 3. Rover sends GPS → forward to controller
      else if (data.type === "gps") {
        const roverid = data.uniqueId;
        const controllerid = roverToController[roverid];

        if (controllerid && clients[controllerid]) {
          clients[controllerid].send(
            JSON.stringify({
              type: "gps_update",
              roverid,
              data: data.data,
            })
          );
          console.log(`📡 Forwarded GPS from ${roverid} → ${controllerid}`);
        }
      }

      // 4. Controller sends instructions → forward to rover
      else if (data.type === "send_instruction") {
        const { fromId, throttle, steering, command } = data;
        const roverid = controllerToRover[fromId];
        if (roverid && clients[roverid]) {
          clients[roverid].send(
            JSON.stringify({
              type: "receive_instruction",
              throttle,
              steering,
              command,
            })
          );
          console.log(
            `➡️ Sent instruction from ${fromId} → ${roverid}`,
            { throttle, steering, command }
          );
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

// ✅ IMPORTANT: Render gives PORT via env variable
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ WebSocket running on ws://localhost:${PORT}`);
});
