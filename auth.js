// created to store endpoint /login as there are special authentication measures for this request
const jwtSecret = "your_jwt_secret";

const jwt = require("jsonwebtoken"),
  passport = require("passport");

require("./passport");

let generateJWTToken = (user) => {
  return jwt.sign(user, jwtSecret, {
    subject: user.Username,
    expiresIn: "7d",
    algorithm: "HS256",
  });
};

module.exports = (router) => {
  router.post("/login", (req, res) => {
    passport.authenticate("local", { session: false }, (error, user, info) => {
      console.log("Info message:", info.message);

      if (error || !user) {
        if (info && info.message === "Incorrect password") {
          return res.status(400).json({
            message: info.message,
          });
        } else if (info && info.message === "No such user") {
          return res.status(400).json({
            message: info.message,
          });
        } else {
          return res.status(400).json({
            message: "Something is not right",
          });
        }
      }
      req.login(user, { session: false }, (error) => {
        if (error) {
          res.send(error);
        }

        let token = generateJWTToken(user.toJSON());
        return res.json({ user, token });
      });
    })(req, res);
  });
};
