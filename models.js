const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// define movie schema in order to keep documents in both collections uniform
const movieSchema = mongoose.Schema({
  Title: { type: String, required: true },
  Description: { type: String, required: true },
  Genre: {
    Name: String,
    Description: String,
  },
  Director: {
    Name: String,
    Bio: String,
  },
  Actors: [String],
  ImagePath: String,
  Featured: Boolean,
});

// define user schema in order to keep documents in both collections uniform
const userSchema = mongoose.Schema({
  Username: { type: String, required: true },
  Password: { type: String, required: true },
  Email: { type: String, required: true },
  Birthday: Date,
  FavoriteMovies: [{ type: mongoose.Schema.Types.Title, ref: "Movie" }],
});

// define methods to hash passwords
userSchema.statics.hashedPassword = function (password) {
  return bcrypt.hashSync(password, 10);
};

userSchema.methods.validatePassword = function (password) {
  return bcrypt.compareSync(password, this.Password);
};

// Once defined, create models that use the schemas you’ve defined
const Movie = mongoose.model("Movie", movieSchema);
const User = mongoose.model("User", userSchema);

module.exports.Movie = Movie;
module.exports.User = User;
