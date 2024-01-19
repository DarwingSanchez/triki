const express = require("express");
const path = require("path");
const socketIO = require("socket.io");
const bodyParser = require("body-parser");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const http = require("http");

const app = express();
const port = 4000;
const server = http.createServer(app); // Crea un servidor HTTP utilizando Express
const io = socketIO(server); // Configura socket.io en el servidor

// CORS Middleware
app.use(cors());

// Set static folder
app.use(express.static(path.join(__dirname, "/public")));

// Body Parser Middleware
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

/** Routes */
app.get("/generateRoom", (req, res) => {
  try {
    const uuid = uuidv4();
    const room = uuid.substring(0, 4).trim();
    res
      .status(200)
      .json({
        message: "Room generated successfully",
        room: room.toUpperCase(),
      });
  } catch (error) {
    res.status(500).json({ message: "Error in the server", room: null });
  }
});

// Manejar conexiones de socket
io.on("connection", (socket) => {
  console.log("Usuario conectado con id", socket.id);

  socket.on("join_game", (data) => {
    const room = data.room;
    socket.join(`game_${room}`);
    console.log(`User with id ${socket.id} connected to a room ${room}`);
  });

  socket.on("leave_game", (data) => {
    const room = data.room;
    socket.leave(`game_${room}`);
    console.log(`User left the room ${room}`);
  });

  // Manejar eventos personalizados, por ejemplo, cuando un jugador realiza un movimiento
  socket.on("movement", (data) => {
    const { table, room } = data;
    console.log(`User move ${socket.id} for room: ${room}`);
    socket.broadcast.to(`game_${room}`).emit(`updateTable`, table);
    // Check winner
    const winner = checkWinner(table);
    if (winner) {
      console.log(`User with id ${socket.id} is the winner for room: ${room}`);
      io.to(`game_${room}`).emit('winner', winner);
    }
  });

  socket.on('won', data => {
    const { winner, table, room } = data;
    console.log(`User with id ${socket.id} won for room: ${room}`);
    socket.broadcast.to(`game_${room}`).emit(`winner`, { winner, table });
})

  // Manejar desconexiones de socket
  socket.on("disconnect", () => {
    console.log("Usuario desconectado");
  });
});

const checkWinner = (boxes) => {
  const winCombinations = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Filas
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columnas
    [0, 4, 8], [2, 4, 6]              // Diagonales
  ];

  for (const combination of winCombinations) {
    const [a, b, c] = combination;

    if (boxes[a] === boxes[b] && boxes[a] === boxes[c] && boxes[a] !== "") {
      return `Ganador ${boxes[a].toUpperCase()}`;
    }
  }

  return null
}

server.listen(port, () => {
  console.log("Server started on port " + port);
});
