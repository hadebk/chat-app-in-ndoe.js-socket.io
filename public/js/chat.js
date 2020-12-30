const socket = io();

// HTML Elements
const $messageForm = document.querySelector("#message-form");
const $messageFormInput = $messageForm.querySelector("input");
const $messageFormButton = $messageForm.querySelector("button");
const $sendLocationButton = document.querySelector("#send-location");
const $messages = document.querySelector("#messages");
const $sidebar = document.querySelector("#sidebar");

// HTML Templates
const messageTemplate = document.querySelector("#message-template").innerHTML;
const locationMessageTemplate = document.querySelector(
  "#location-message-template"
).innerHTML;
const sidebarTemplate = document.querySelector("#sidebar-template").innerHTML;

// Options
const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const autoScroll = () => {
  // New message element
  const $newMessage = $messages.lastElementChild;

  // Height of the last new message
  const newMessageStyles = getComputedStyle($newMessage);
  const newMessageMargin = parseInt(newMessageStyles.marginBottom);
  const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

  // Visible height
  const visibleHeight = $messages.offsetHeight;

  // Height of messages container
  const containerHeight = $messages.scrollHeight;

  // How far have i scroll?
  const scrollOffset = $messages.scrollTop + visibleHeight;

  // scroll down just if the user is on the bottom of messages container,
  // if the user is reading some old messages up in chat, not scroll the view to bottom
  if (containerHeight - newMessageHeight <= scrollOffset) {
    // user is in the bottom of messages container
    $messages.scrollTop = $messages.scrollHeight;
  } else {
    // user is up reading old messages, so there is no scrolling to bottom.
    console.log("new message comes");
    document.querySelector(".newMessageComes").style.display = "block";
    setTimeout(()=>{
      document.querySelector(".newMessageComes").style.display = "none";
    },1500)
  }
};

// listening to server's event - get user's message
socket.on("message", (message) => {
  /**
   * render message temp to ui
   * @param_1 temp name
   * @param_2 key:value, you can access this key from html be invoke it like this {{message}}
   */
  const html = Mustache.render(messageTemplate, {
    username: message.username,
    message: message.text,
    createdAt: moment(message.createdAt).format("h:mm a"),
  });
  $messages.insertAdjacentHTML("beforeend", html);
  autoScroll();
});

// listening to server's event - get user's location
socket.on("locationMessage", (location) => {
  /**
   * render location message temp to ui
   * @param_1 temp name
   * @param_2 key:value, you can access this key from html be invoke it like this {{url}}
   */
  const html = Mustache.render(locationMessageTemplate, {
    username: location.username,
    url: location.url,
    createdAt: moment(location.createdAt).format("h:mm a"),
  });
  $messages.insertAdjacentHTML("beforeend", html);
  autoScroll();
});

// listening to server's event - users in room
socket.on("roomData", ({ room, users }) => {
  const html = Mustache.render(sidebarTemplate, {
    room,
    users,
  });
  $sidebar.innerHTML = html;
});

$messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  // disable form until tha message arrived
  $messageFormButton.disabled = true;

  const messageText = $messageFormInput.value.trim();

  if (messageText.length == 0) {
    // enable form agin
    $messageFormButton.disabled = false;
    $messageFormInput.value = "";
    $messageFormInput.focus();
    return console.log("Type something!");
  }
  /**
   * .emit(): create new event, it will be listened from server.
   * @param_1 event name
   * @param_2 pass any value to event, it will be accessed by the server
   * @param_3 callback fun, will run when the event is acknowledged. This cb fun, will be accessed by the server.
   */
  socket.emit("sendMessage", messageText, (error) => {
    // enable form agin
    $messageFormButton.disabled = false;
    $messageFormInput.value = "";
    $messageFormInput.focus();
    if (error) {
      return console.log(error);
    }
    console.log("Message delivered!");
  });
});

$sendLocationButton.addEventListener("click", () => {
  // check if browser not support geolocation
  if (!navigator.geolocation) {
    return alert("Geolocation is not supported by your browser!");
  }

  // disable it until tha location arrived
  $sendLocationButton.disabled = true;

  // get user location (lat&long)
  navigator.geolocation.getCurrentPosition((position) => {
    socket.emit(
      "sendLocation",
      {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
      () => {
        // enable send location button agin
        $sendLocationButton.disabled = false;
        console.log("Location shared!");
      }
    );
  });
});

// join form error, ex: if existing user trying to login agin!
socket.emit("join", { username, room }, (error) => {
  if (error) {
    alert(error);
    location.href = "/";
  }
});
