/**
 * A server-side programming framework that simplifies Node.js syntax, making it easier to write server-side code.
 * Used to create and maintain web servers as well as manage HTTP requests, rather than using modules.
 * @module server
 */

// Import required modules
const express = require("express"); // Fast, unopinionated, minimalist web framework for Node.js
const bodyParser = require("body-parser"); // Parse incoming request bodies
const uuid = require("uuid"); // Generate unique IDs
const morgan = require("morgan"); // HTTP request logger middleware for Node.js
const fs = require("fs"); // File system module
const path = require("path"); // Utility module for working with file and directory paths
const mongoose = require("mongoose"); // MongoDB object modeling tool designed to work in an asynchronous environment
const Models = require("./models.js"); // Custom module containing Mongoose models

// Destructure models from the imported module
const Movies = Models.Movie;
const Users = Models.User;

// Create an Express application
const app = express();

// Parse JSON request bodies
app.use(bodyParser.json());

// Enable CORS (Cross-Origin Resource Sharing)
const cors = require("cors");
app.use(cors());

/**
 * Import and configure authentication middleware.
 * @see {@link module:auth}
 */
const auth = require("./auth")(app);
// use of app here ensures Express is available in auth.js as well

/**
 * Import and configure passport for authentication.
 * @see {@link https://passportjs.org/}
 */
const passport = require("passport");
require("./passport");

/**
 * Import express-validator for input validation.
 * @see {@link https://express-validator.github.io/docs/}
 */
const { check, validationResult } = require("express-validator");

/**
 * Create a write stream for logging access requests to a file.
 * @see {@link https://nodejs.org/api/fs.html#fs_fs_createwritestream_path_options}
 */
const accessLogStream = fs.createWriteStream(path.join(__dirname, "log.txt"), {
  flags: "a",
});

/**
 * Connect to the MongoDB database using Mongoose.
 * @see {@link https://mongoosejs.com/}
 */
mongoose.connect(process.env.CONNECTION_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Database
const db = mongoose.connection;

/**
 * Event listener for MongoDB connection error.
 * @event db#error
 */
db.on("error", console.error.bind(console, "MongoDB connection error:"));

/**
 * Event listener for successful MongoDB connection.
 * @event db#open
 */
db.once("open", () => {
  console.log("Connected to MongoDB!");
});

/**
 * Use morgan middleware for logging HTTP requests to a file.
 * @see {@link https://github.com/expressjs/morgan}
 */
app.use(morgan("combined", { stream: accessLogStream }));

/**
 * Route for handling GET requests to the root endpoint.
 * Displays a welcome message.
 * @name GET /
 * @function
 * @memberof module:server
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @returns {Object} Express response object with a welcome message.
 */
app.get("/", (req, res) => {
  res.send("Welcome to my movie api");
});

/**
 * Route for handling GET requests to the /documentation endpoint.
 * Displays the documentation HTML page.
 * @name GET /documentation
 * @function
 * @memberof module:server
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @returns {Object} Express response object with the documentation HTML page.
 */
app.get("/documentation", (req, res) => {
  res.sendFile("/public/documentation.html", { root: __dirname });
});

// get a list of movies
app.get(
  "/movies",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    // To fetch all movies
    await Movies.find()
      // To only fetch movie titles only it'd be
      // await Movies.find({}, "Title") // Only fetch the 'Title' field
      // .then((movies) => {
      //   const movieTitles = movies.map((movie) => movie.Title);
      //   res.json(movieTitles);
      // })
      .then((movies) => res.send(movies))
      .catch((error) => {
        console.error("Error fetching movies:", error);
        res.status(500).send("Error fetching movies" + error);
      });
  }
);

// return data about a single movie by title
app.get(
  "/movies/:title",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    await Movies.findOne({ Title: req.params.title })
      .then((movie) => {
        if (movie) {
          res.send(movie);
        }
      })
      .catch((err) => {
        res.status(500).send("Error fetching movie" + err);
      });
  }
);

// return data about a genre
app.get("/movies/genre/:genre", (req, res) => {
  Movies.find({ "Genre.Name": req.params.genre })
    .then((movies) => {
      if (movies && movies.length > 0) {
        res.json(movies);
      } else {
        res.status(404).send("No movies found in that genre");
      }
    })
    .catch((err) => {
      res.status(500).send("Error fetching movies" + err);
    });
});

// return data about a director
app.get("/movies/director/:director", (req, res) => {
  Movies.findOne({ "Director.Name": req.params.director })
    .then((movie) => {
      if (movie && movie.Director) {
        res.json(movie.Director);
      } else {
        res.status(404).send("Director not found");
      }
    })
    .catch((err) => {
      res.status(500).send("Error fetching director's info: " + err);
    });
});

// return list of users
app.get("/users", (req, res) => {
  Users.find()
    .then((users) => {
      res.status(201).json(users);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send("Error: " + err);
    });
});

// Retrive a list of user's list of favorites
app.get(
  "/users/:Username/favoriteMovies",
  // passport.authenticate("jwt", { session: false })
  (req, res) => {
    Users.findOne({ Username: req.params.Username })
      .then((user) => {
        if (!user) {
          res.status(400).send(req.params.Username + " was not found.");
        } else {
          res.status(200).json(user.FavoriteMovies);
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send("Error: " + err);
      });
  }
);

// allow new users to register
app.post(
  "/users",
  [
    check("Username", "Username is required").isLength({ min: 5 }),
    check(
      "Username",
      "Username contains non alphanumeric characters - not allowed."
    ).isAlphanumeric(),
    check("Password", "Password is required").not().isEmpty(),
    check("Email", "Email does not appear to be valid").isEmail(),
  ],
  async (req, res) => {
    // check the validation object for errors
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    // if there are no errors
    let hashedPassword = Users.hashedPassword(req.body.Password);
    await Users.findOne({ Username: req.body.Username }) //Search to see if a user with the requested username already exists
      .then((user) => {
        if (user) {
          //if the user is found, send a response that it already exists
          res.status(400).send(req.body.Username + " already exists");
        } else {
          Users.create({
            Username: req.body.Username,
            Password: hashedPassword,
            Email: req.body.Email,
            Birthday: req.body.Birthday,
          })
            .then((user) => {
              res.status(201).json(user);
            })
            .catch((error) => {
              console.error(error);
              res.status(500).send("Error: " + error);
            });
        }
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send("Error: " + error);
      });
  }
);

// allow users to update their info
app.put(
  "/users/:Username",
  [
    check("Username", "Username is required").isLength({ min: 5 }),
    check(
      "Username",
      "Username contains non-alphanumeric characters - not allowed."
    ).isAlphanumeric(),
    check("Password", "Password is required").not().isEmpty(),
    check("Email", "Email does not appear to be valid").isEmail(),
  ],
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    if (req.user.Username !== req.params.Username) {
      return res.status(401).send("Unauthorized");
    }

    // Hash the password
    let hashedPassword = Users.hashedPassword(req.body.Password);

    await Users.findOneAndUpdate(
      { Username: req.params.Username },
      {
        $set: {
          Username: req.body.Username,
          Password: hashedPassword,
          Email: req.body.Email,
          Birthday: req.body.Birthday,
        },
      },
      { new: true } // Use { new: true } to return the updated document
    )
      .then((updatedUser) => {
        if (updatedUser) {
          console.log("Updated user:", updatedUser);
          res.status(200).json(updatedUser);
        } else {
          res.status(404).send("User not found");
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send("Error: " + err);
      });
  }
);

// allow users to add a movie to their favorite list
app.post(
  "/users/:Username/movies/:MovieID",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    console.log(req.params.Username, req.params.MovieID);
    Users.findOneAndUpdate(
      { Username: req.params.Username },
      {
        $push: { FavoriteMovies: req.params.MovieID },
      },
      { new: true }
    )
      .then((updatedUser) => {
        if (updatedUser) {
          console.log("Updated user:", updatedUser);
          res.status(200).json(updatedUser);
        } else {
          res.status(404).send("User not found");
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send("Error: " + err);
      });
  }
);

// delete a user from the database
app.delete(
  "/users/:Username",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    Users.findOneAndDelete({ Username: req.params.Username })
      .then((user) => {
        if (!user) {
          res.status(400).send(req.params.Username + " was not found.");
        } else {
          res.status(200).send(req.params.Username + " was deleted.");
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send("Error: " + err);
      });
  }
);

// remove a movie from the database
app.delete("/movies/:Title", async (req, res) => {
  Movies.findOneAndDelete({ Title: req.params.Title }).then((movie) => {
    if (!movie) {
      res.status(400).send(req.params.Title + " was not found.");
    } else {
      res.status(200).send(req.params.Title + " was deleted.");
    }
  });
});

// allow users to remove a movie from their favorite list
app.delete(
  "/users/:Username/movies/:MovieID",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    Users.findOneAndUpdate(
      { Username: req.params.Username },
      {
        $pull: { FavoriteMovies: req.params.MovieID },
      },
      { new: true }
    )
      .then((updatedUser) => {
        if (updatedUser) {
          console.log("Updated user:", updatedUser);
          res.status(200).json(updatedUser);
        } else {
          res.status(404).send("User not found");
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send("Error: " + err);
      });
  }
);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// listen for requests
const port = process.env.PORT || 8080;
app.listen(port, "0.0.0.0", () => {
  console.log("Listening on Port " + port);
});
