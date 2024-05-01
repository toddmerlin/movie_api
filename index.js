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

/**
 * Route for returning the data for all movies.
 * @name GET /movies
 * @function
 * @memberof module:server
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
app.get(
  "/movies",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    await Movies.find()
      .then((movies) => res.status(200).json(movies))
      .catch((error) => {
        console.error("Error fetching movies:", error);
        res.status(500).send("Error fetching movies" + error);
      });
  }
);

/**
 * Route for returning data about a single movie by its title.
 * @name GET /movies/:title
 * @function
 * @memberof module:server
 * @param {string} title - The title of the movie.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
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

/**
 * Route for returning data on all movies of a specified genre.
 * @name GET /movies/genre/:genre
 * @function
 * @memberof module:server
 * @param {string} genre - The name of the genre.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
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

/**
 * Route for returning data on all movies of a nominated director.
 * @name GET /movies/director/:director
 * @function
 * @memberof module:server
 * @param {string} director - The name of the director.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
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

/**
 * Route for returning a list of users.
 * @name GET /users
 * @function
 * @memberof module:server
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
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

/**
 * Route for retrieving the movie id's of a user's favorite movies
 * @name GET /users/:Username/favoriteMovies
 * @function
 * @memberof module:server
 * @param {string} Username - The username of the user.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
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

/**
 * Route for allowing new users to register.
 * Validates input fields such as username, password, and email.
 * @name POST /users
 * @function
 * @memberof module:server
 * @param {string} Username - The desired username for the new user.
 * @param {string} Password - The password for the new user.
 * @param {string} Email - The email address for the new user.
 * @param {string} Birthday - The birthday of the new user (optional).
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
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

/**
 * Route for allowing users to update their information.
 * Requires authentication using JWT.
 * Validates input fields such as username, password, and email.
 * @name PUT /users/:Username
 * @function
 * @memberof module:server
 * @param {string} Username - The username of the user.
 * @param {string} Password - The password of the user.
 * @param {string} Email - The email of the user.
 * @param {string} Birthday - The birthday of the user (optional).
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
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

/**
 * Route for allowing users to add a movie to their favorite list.
 * Requires authentication using JWT.
 * @name POST /users/:Username/movies/:MovieID
 * @function
 * @memberof module:server
 * @param {string} Username - The username of the user.
 * @param {string} MovieID - The ID of the movie to be added to the user's favorite list.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
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

/**
 * Route for deleting a user from the database.
 * Requires authentication using JWT.
 * @name DELETE /users/:Username
 * @function
 * @memberof module:server
 * @param {string} Username - The username of the user to be deleted.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
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

/**
 * Route for deleting a movie by its title.
 * @name DELETE /movies/:Title
 * @function
 * @memberof module:server
 * @param {string} Title - The title of the movie to be deleted.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
app.delete("/movies/:Title", async (req, res) => {
  Movies.findOneAndDelete({ Title: req.params.Title }).then((movie) => {
    if (!movie) {
      res.status(400).send(req.params.Title + " was not found.");
    } else {
      res.status(200).send(req.params.Title + " was deleted.");
    }
  });
});

/**
 * Route for allowing users to remove a movie from their favorite list.
 * Requires authentication using JWT.
 * @name DELETE /users/:Username/movies/:MovieID
 * @function
 * @memberof module:server
 * @param {string} Username - The username of the user.
 * @param {string} MovieID - The ID of the movie to be removed from the user's favorite list.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */ app.delete(
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

/**
 * Error handling middleware to handle errors in the Express application.
 * Logs the error stack trace and sends a 500 Internal Server Error response with a generic error message.
 * @name Error Handling Middleware
 * @function
 * @memberof module:server
 * @param {Error} err - The error object.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - The next middleware function in the stack.
 */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

/**
 * Start the Express server and listen for incoming requests.
 * If the environment variable PORT is not defined, default to port 8080.
 * @name Listen for Requests
 * @function
 * @memberof module:server
 * @param {number} port - The port number to listen on.
 * @param {string} hostname - The hostname or IP address to bind to (optional).
 * @param {Function} callback - Callback function to be executed once the server is listening.
 */
const port = process.env.PORT || 8080;
app.listen(port, "0.0.0.0", () => {
  console.log("Listening on Port: " + port);
});
