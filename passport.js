// This passport file is used to handle authentication. Here’s what each line does:
// To install: npm install passport passport-local passport-jwt jsonwebtoken
// 1st line installs the main passport library, 2nd line installs the LocalStrategy for authentication
//  3rd line installs the JWTStrategy for authentication with 4th line installing jsonwebtoken for basic HTTP authentication (username/password) and continuous authorization.

const passport = require("passport"),
  LocalStrategy = require("passport-local").Strategy,
  Models = require("./models.js"),
  passportJWT = require("passport-jwt");

let Users = Models.User,
  JWTStrategy = passportJWT.Strategy,
  ExtractJWT = passportJWT.ExtractJwt;

// defines the basic HTTP authentication (username/password) for login request
passport.use(
  new LocalStrategy(
    {
      usernameField: "Username",
      passwordField: "Password",
    },
    async (username, password, callback) => {
      try {
        const user = await Users.findOne({ Username: username });
        if (!user) {
          console.log("User not found"); // Log the message
          return callback(null, false, { message: "User not found" });
        }
        if (!user.validatePassword(password)) {
          return callback(null, false, { message: "Incorrect password" });
        }
        return callback(null, user);
      } catch (error) {
        return callback(error);
      }
    }
  )
);

// allows user authentication with JWT submitted alongside their request
passport.use(
  new JWTStrategy(
    {
      jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
      secretOrKey: "your_jwt_secret",
    },
    async (jwtPayload, callback) => {
      return await Users.findById(jwtPayload._id)
        .then((user) => {
          return callback(null, user);
        })
        .catch((error) => {
          return callback(error);
        });
    }
  )
);
