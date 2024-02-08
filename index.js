// A server side programming framework that simplifies Node.js syntax, making it easier to write server-side code - used to create and maintain web servers as well as manage HTTP requests, rather than using modules

const express = require("express"),
  bodyParser = require("body-parser"),
  uuid = require("uuid"),
  morgan = require("morgan"),
  fs = require("fs"),
  path = require("path"),
  mongoose = require("mongoose"),
  Models = require("./models.js");

const Movies = Models.Movie;
const Users = Models.User;

const app = express();

app.use(bodyParser.json());

const cors = require("cors");
app.use(cors());

let auth = require("./auth")(app);
// use of app here ensures Express is available in auth.js as well

const passport = require("passport");
require("./passport");

const { check, validationResult } = require("express-validator");

const accessLogStream = fs.createWriteStream(path.join(__dirname, "log.txt"), {
  flags: "a",
});

mongoose.connect("mongodb://127.0.0.1:27017/cfDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Database
const db = mongoose.connection;

db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB!");
});

app.use(morgan("combined", { stream: accessLogStream }));

// app.use(express.static(path.join(___dirname, "public")));

// GET requests
app.get("/", (req, res) => {
  res.send("Welcome to my movie api");
});

// get documentation
app.get("/documentation", (req, res) => {
  res.sendFile("/public/documentation.html", { root: __dirname });
});

// get a list of movies
app.get(
  "/movies",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    await Movies.find({}, "Title") // Only fetch the 'Title' field
      .then((movies) => {
        const movieTitles = movies.map((movie) => movie.Title);
        res.json(movieTitles);
      })
      .catch((err) => {
        console.error("Error fetching movies:", err);
        res.status(500).send("Error fetching movies" + err);
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

// // return list of users
// app.get("/users", (req, res) => {
//   Users.find()
//     .then((users) => {
//       res.status(201).json(users);
//     })
//     .catch((err) => {
//       console.error(err);
//       res.status(500).send("Error: " + err);
//     });
// });

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
    await Users.findOneAndUpdate(
      { Username: req.params.Username },
      {
        $set: {
          Username: req.body.Username,
          Password: req.body.Password,
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

// delete a user
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

// let movies = [
//   {
//     title: "Tommy Boy",
//     description: "A drama about a woman who falls in love with a boy",
//     director: "Peter Segal",
//     genre: "Comedy",
//     image: "Tommyboy.jpeg",
//     id: uuid.v4(),
//   },
//   {
//     title: "Office Space",
//     description: "A drama about a woman who falls in love with a boy",
//     director: "Mike Judge",
//     genre: "Comedy",
//     image: "OfficeSpace.jpeg",
//     id: uuid.v4(),
//   },
//   {
//     title: "Elf",
//     description: "A drama about a woman who falls in love with a boy",
//     director: "Jon Favreau",
//     genre: "Christmas",
//     image: "Elf.jpeg",
//     id: uuid.v4(),
//   },
//   {
//     title: "Die Hard",
//     description: "A drama about a woman who falls in love with a boy",
//     director: "John McTiernan",
//     genre: "Christmas",
//     image: "Diehard.jpeg",
//     id: uuid.v4(),
//   },
//   {
//     title: "Nightmare on Elm Street",
//     description: "A drama about a woman who falls in love with a boy",
//     director: "Wes Craven",
//     genre: "Horror",
//     image: "Nightmare.jpeg",
//     id: uuid.v4(),
//   },
//   {
//     title: "Nope",
//     description: "A drama about a woman who falls in love with a boy",
//     director: "Jordan Peele",
//     genre: "Horror",
//     image: "Nope.jpeg",
//     id: uuid.v4(),
//   },
//   {
//     title: "The Godfather",
//     description: "A drama about a woman who falls in love with a boy",
//     director: "Francis Ford Coppola",
//     genre: "Drama",
//     image: "Godfather.jpeg",
//     id: uuid.v4(),
//   },
//   {
//     title: "The Notebook",
//     description: "A drama about a woman who falls in love with a boy",
//     director: "Nick Cassavetes",
//     genre: "Drama",
//     image: "Notebook.jpeg",
//     id: uuid.v4(),
//   },

//   {
//     title: "Terminator 2",
//     description: "A drama about a woman who falls in love with a boy",
//     director: "James Cameron",
//     genre: "Action",
//     image: "Terminator2.jpeg",
//     id: uuid.v4(),
//   },
//   {
//     title: "Avatar",
//     description: "A drama about a woman who falls in love with a boy",
//     director: "James Cameron",
//     genre: "Action",
//     image: "Avatar.jpeg",
//     id: uuid.v4(),
//   },
// ];