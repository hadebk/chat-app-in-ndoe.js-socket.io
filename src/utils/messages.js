const generateMessage = (username, text) => {
  return {
    username,
    text,
    createdAt: new Date().getTime(), // timestamp
  };
};

const generateLocationMessage = (username, url) => {
  return {
    username,
    url,
    createdAt: new Date().getTime(), // timestamp
  };
};

module.exports = {
  generateMessage,
  generateLocationMessage,
};
