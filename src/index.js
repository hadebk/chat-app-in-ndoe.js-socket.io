const path = require("path");
const http = require("http");
const express = require("express");
const socketIo = require("socket.io");
const Filter = require("bad-words");
const {
  generateMessage,
  generateLocationMessage,
} = require("./utils/messages");

const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom,
} = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = process.env.PORT || 4000;
const publicDirectoryPath = path.join(__dirname, "../public");

app.use(express.static(publicDirectoryPath));

// each time a clint open a connection, do the following..
io.on("connection", (socket) => {
  console.log("New websocket connection!");

  // listening to clint's event on user join room.
  socket.on("join", (userData, callback) => {
    const { error, user } = addUser({ id: socket.id, ...userData });

    if (error) {
      return callback(error);
    }

    // allow user to join chat room. Receive chat room name.
    socket.join(user.room);

    // create a new event
    socket.emit("message", generateMessage(user.room, "Welcome!"));

    // emit data to all connected users in specific room, except current user.
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        generateMessage(user.room, `${user.username} has joined!`)
      );

    // new user come => update users list
    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    callback();
  });

  // listening to clint's event - send message
  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);
    // filter message before show it to all users
    const filter = new Filter();
    if (filter.isProfane(message)) {
      // pass an error
      return callback("Profanity is not allowed!");
    }

    // pass message to all current users
    io.to(user.room).emit("message", generateMessage(user.username, message));
    // verify that the message was received correctly
    callback();
  });

  // listening to clint's event - send location
  socket.on("sendLocation", (coords, callback) => {
    const user = getUser(socket.id);
    // share location with all connected users
    io.to(user.room).emit(
      "locationMessage",
      generateLocationMessage(
        user.username,
        `https://google.com/maps?q=${coords.latitude},${coords.longitude}`
      )
    );
    // verify that the location was shared correctly
    callback();
  });

  // listen to disconnect user event
  socket.on("disconnect", () => {
    // remove user from room
    const user = removeUser(socket.id);

    if (user) {
      // emit the message to all connected users in this specific room.
      io.to(user.room).emit(
        "message",
        generateMessage(user.room, `${user.username} has left!`)
      );
      // a user left => update users list
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

server.listen(port, () => {
  console.log("Server is up on port " + port);
});
