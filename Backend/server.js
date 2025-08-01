const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["https://ppc-frontend-mb.onrender.com","http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

const gameRooms = {};
const players = {};

function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function cleanupInactiveRooms() {
  const now = Date.now();
  const ROOM_TIMEOUT = 30 * 60 * 1000;
  const PLAYER_TIMEOUT = 5 * 60 * 1000;

  for (const roomId in gameRooms) {
    const room = gameRooms[roomId];
    if (now - room.createdAt > ROOM_TIMEOUT) {
      console.log(`Cleaning up inactive room: ${roomId}`);
      delete gameRooms[roomId];
    }
  }

  for (const playerId in players) {
    const player = players[playerId];
    if (now - player.lastActivity > PLAYER_TIMEOUT) {
      console.log(`Cleaning up inactive player: ${playerId}`);
      delete players[playerId];
    }
  }
}

setInterval(cleanupInactiveRooms, 5 * 60 * 1000);

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    rooms: Object.keys(gameRooms).length,
    players: Object.keys(players).length,
    timestamp: new Date().toISOString()
  });
});

app.get('/rooms', (req, res) => {
  const roomsInfo = Object.entries(gameRooms).map(([roomId, room]) => ({
    roomId,
    otp: room.otp,
    players: room.players.length,
    gameStarted: room.gameStarted,
    createdAt: new Date(room.createdAt).toISOString()
  }));
  res.json(roomsInfo);
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  players[socket.id] = {
    id: socket.id,
    lastActivity: Date.now()
  };

  const updateActivity = () => {
    if (players[socket.id]) {
      players[socket.id].lastActivity = Date.now();
    }
  };

  socket.on('createGame', () => {
    updateActivity();
    
    let otp;
    let roomId;
    
    do {
      otp = generateOTP();
      roomId = `room_${otp}`;
    } while (gameRooms[roomId]);

    gameRooms[roomId] = {
      players: [socket.id],
      choices: {},
      otp,
      createdAt: Date.now(),
      gameStarted: false
    };

    players[socket.id].roomId = roomId;
    socket.join(roomId);
    
    console.log(`Game created: ${roomId} by ${socket.id}`);
    socket.emit('gameCreated', { otp, roomId });
  });

  socket.on('joinGame', ({ otp }) => {
    updateActivity();
    
    const roomId = `room_${otp}`;
    const room = gameRooms[roomId];

    if (!room) {
      console.log(`Invalid OTP attempt: ${otp} by ${socket.id}`);
      socket.emit('invalidOTP');
      return;
    }

    if (room.players.length >= 2) {
      console.log(`Room full attempt: ${roomId} by ${socket.id}`);
      socket.emit('roomFull');
      return;
    }

    if (room.players.includes(socket.id)) {
      console.log(`Player already in room: ${socket.id} in ${roomId}`);
      // FIX: Envoyer le roomId même si le joueur est déjà dans la room
      socket.emit('gameJoined', { roomId, otp: room.otp });
      socket.emit('gameReady', { players: room.players });
      return;
    }

    room.players.push(socket.id);
    players[socket.id].roomId = roomId;
    socket.join(roomId);

    console.log(`Player joined: ${socket.id} joined ${roomId}`);
    
    // FIX: Envoyer le roomId au joueur qui rejoint
    socket.emit('gameJoined', { roomId, otp: room.otp });
    io.to(roomId).emit('gameReady', { players: room.players });

    if (room.players.length === 2 && !room.gameStarted) {
      room.gameStarted = true;
      console.log(`Game starting: ${roomId}`);
      io.to(roomId).emit('startGame');
    }
  });

  socket.on('makeChoice', ({ roomId, choice }) => {
    updateActivity();
    
    const room = gameRooms[roomId];
    if (!room) {
      console.log(`Invalid room for choice: ${roomId}`);
      return;
    }

    if (!room.players.includes(socket.id)) {
      console.log(`Unauthorized choice attempt: ${socket.id} not in ${roomId}`);
      return;
    }

    room.choices[socket.id] = choice;
    console.log(`Choice made: ${socket.id} chose ${choice} in ${roomId}`);

    socket.to(roomId).emit('opponentChoiceMade');

    const choiceCount = Object.keys(room.choices).length;
    if (choiceCount === 2) {
      console.log(`Both choices made in ${roomId}, starting countdown`);
      
      io.to(roomId).emit('startCountdown');

      setTimeout(() => {
        const [player1, player2] = room.players;
        const choice1 = room.choices[player1];
        const choice2 = room.choices[player2];

        let result;
        if (
          choice1 && choice2 &&
          (choice1 === 'pierre' || choice1 === 'papier' || choice1 === 'ciseau') &&
          (choice2 === 'pierre' || choice2 === 'papier' || choice2 === 'ciseau')
        ) {
          result = determineWinner(choice1, choice2);
          console.log(`Game result in ${roomId}: ${choice1} vs ${choice2} = ${result}`);
        } else {
          result = 'invalid';
          console.log(`Invalid game state in ${roomId}`);
        }

        io.to(roomId).emit('revealChoices', {
          choices: {
            [player1]: choice1,
            [player2]: choice2
          },
          result,
          winnerId: result === 'player1' ? player1 : result === 'player2' ? player2 : null
        });

        room.choices = {};
      }, 3000);
    }
  });

  socket.on('playAgain', ({ roomId }) => {
    updateActivity();
    
    const room = gameRooms[roomId];
    if (!room || !room.players.includes(socket.id)) {
      return;
    }

    room.choices = {};
    console.log(`Play again requested in ${roomId}`);
    
    io.to(roomId).emit('newRound');
  });

  socket.on('leaveGame', ({ roomId }) => {
    updateActivity();
    
    const room = gameRooms[roomId];
    if (!room) return;

    const index = room.players.indexOf(socket.id);
    if (index !== -1) {
      room.players.splice(index, 1);
      socket.leave(roomId);
      
      if (players[socket.id]) {
        delete players[socket.id].roomId;
      }

      console.log(`Player left: ${socket.id} left ${roomId}`);

      if (room.players.length === 0) {
        console.log(`Room deleted: ${roomId}`);
        delete gameRooms[roomId];
      } else {
        io.to(roomId).emit('opponentDisconnected');
      }
    }
  });

  socket.on('ping', () => {
    updateActivity();
    socket.emit('pong');
  });

  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, 'Reason:', reason);

    const player = players[socket.id];
    if (player && player.roomId) {
      const room = gameRooms[player.roomId];
      if (room) {
        const index = room.players.indexOf(socket.id);
        if (index !== -1) {
          room.players.splice(index, 1);
          console.log(`Player removed from room: ${socket.id} from ${player.roomId}`);

          if (room.players.length === 0) {
            console.log(`Room deleted on disconnect: ${player.roomId}`);
            delete gameRooms[player.roomId];
          } else {
            io.to(player.roomId).emit('opponentDisconnected');
          }
        }
      }
    }

    delete players[socket.id];
  });

  socket.emit('connected', { 
    playerId: socket.id,
    timestamp: Date.now()
  });
});

function determineWinner(choice1, choice2) {
  if (choice1 === choice2) return 'draw';
  
  const winningCombos = {
    'pierre': 'ciseau',
    'papier': 'pierre',
    'ciseau': 'papier'
  };

  if (winningCombos[choice1] === choice2) {
    return 'player1';
  }
  
  return 'player2';
}

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  io.emit('serverShutdown', { message: 'Serveur en maintenance, reconnexion automatique...' });
  httpServer.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  io.emit('serverShutdown', { message: 'Serveur arrêté.' });
  httpServer.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

const PORT = process.env.PORT || 5555;
const HOST = process.env.HOST || '0.0.0.0';

httpServer.listen(Number(PORT), HOST, () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
  console.log(`📊 Health check available at http://${HOST}:${PORT}/health`);
  console.log(`🏠 Rooms info available at http://${HOST}:${PORT}/rooms`);
});