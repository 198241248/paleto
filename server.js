const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// Pamięć pokoi
const rooms = {};

const colors = ['red', 'yellow', 'green', 'blue'];
const brailleNumbers = [1, 4, 2, 7, 5, 3, 6, 9];

function generateState() {
  return {
    module: 'kable', // kable -> kierunki -> taniec -> haslo
    lightColor: colors[Math.floor(Math.random() * colors.length)],
    cableCount: Math.random() > 0.5 ? 3 : 4,
    cablesColors: ['red', 'blue', 'yellow', 'green'].sort(() => 0.5 - Math.random()),
    brailleVal: brailleNumbers[Math.floor(Math.random() * brailleNumbers.length)],
    danceName: `dance${Math.floor(Math.random() * 150) + 1}`,
    password: "SILOWNIA"
  };
}

io.on('connection', (socket) => {
  socket.on('joinRoom', ({ roomId, role, hackType }) => {
    socket.join(roomId);
    
    if (!rooms[roomId]) {
      rooms[roomId] = {
        hackType: hackType,
        state: generateState(),
        roles: {}
      };
    }

    rooms[roomId].roles[role] = socket.id;
    socket.emit('gameStateUpdate', rooms[roomId].state);
    io.to(roomId).emit('roomStatus', { roles: Object.keys(rooms[roomId].roles) });
  });

  socket.on('nextModule', ({ roomId, nextMod }) => {
    if (rooms[roomId]) {
      rooms[roomId].state.module = nextMod;
      // Losuj nowe parametry dla kolejnego modułu
      rooms[roomId].state.lightColor = colors[Math.floor(Math.random() * colors.length)];
      rooms[roomId].state.brailleVal = brailleNumbers[Math.floor(Math.random() * brailleNumbers.length)];
      io.to(roomId).emit('gameStateUpdate', rooms[roomId].state);
    }
  });
});

server.listen(3000, () => {
  console.log('Symulator działa na http://localhost:3000');
});