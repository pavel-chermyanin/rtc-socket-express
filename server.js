const express = require("express");
const http = require("http");
const cors = require("cors");
const app = express();
app.use(cors());

const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Этот код создает объект rooms и устанавливает прослушивание события "connection" с помощью io.on. Когда клиент подключается к серверу, сервер ожидает события "join room" от подключенного клиента.

// Когда сервер получает событие "join room", он проверяет наличие комнаты roomID в объекте rooms. Если комната уже существует, сервер добавляет идентификатор сокета клиента в массив rooms[roomID]. Если комнаты нет, сервер создает новую комнату с идентификатором roomID и добавляет идентификатор сокета клиента в эту комнату.

// Затем сервер находит другого пользователя в комнате roomID, используя метод find, и сохраняет его идентификатор в переменной otherUser. Если другой пользователь найден, сервер отправляет сообщение "other user" клиенту, который только что присоединился к комнате, и отправляет сообщение "user joined" другому клиенту, чтобы сообщить о новом пользователе в комнате.
const rooms = {};

const leaveRoom = ( roomID, userID ) => {
  rooms[roomID] = rooms[roomID].filter((id) => id !== userID);
  if (rooms[roomID].length === 0){
    delete rooms[roomID]
  }
  
  // socket.to(roomID).emit("user-disconnected", userID);
};

io.on("connection", (socket) => {
  socket.on("join room", (roomID) => {
    console.log(`user with id: ${socket.id} joined the room: ${roomID}`);
    if (rooms[roomID]) {
      rooms[roomID].push(socket.id);
    } else {
      rooms[roomID] = [socket.id];
    }

    // существует ли уже другой участник в комнате ?
    const otherUser = rooms[roomID].find((id) => id !== socket.id);

    if (otherUser) {
      // отправляем себе на клиент что другой существует
      socket.emit("other user", otherUser);
      // отправляем существующему себя(свой id)
      socket.to(otherUser).emit("user joined", socket.id);
      console.log(rooms);
    }

    socket.on("disconnecting", () => {
      console.log("User left the room", socket.id);
      // находим все комнаты, в которых находится данный клиент
      const userRooms = Object.keys(rooms).filter((roomID) =>
        rooms[roomID].includes(socket.id)
      );
      // вызываем функцию leaveRoom() для каждой комнаты
      userRooms.forEach((roomID) => {
        leaveRoom(roomID, socket.id);
      });
    });
  });

  //   io.to(payload.target).emit('offer', payload) - это метод библиотеки Socket.io, который отправляет событие "offer" с данными (payload) всем подключенным клиентам, которые находятся в комнате, указанной в payload.target.

  // Таким образом, когда клиент отправляет событие "offer" с данными (payload), сервер принимает это событие с помощью обработчика событий socket.on('offer', payload => {...}) и затем отправляет эту же информацию всем подключенным клиентам, которые находятся в комнате, указанной в payload.target.
  socket.on("offer", (payload) => {
    io.to(payload.target).emit("offer", payload);
  });

  socket.on("answer", (payload) => {
    io.to(payload.target).emit("answer", payload);
  });

  socket.on("ice-candidate", (incoming) => {
    io.to(incoming.target).emit("ice-candidate", incoming.candidate);
  });
});

server.listen(8000, () => {
  console.log("Server is running on port 8000");
});
