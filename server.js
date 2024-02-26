const http = require("http");
const fs = require("fs");
const url = require("url");
const passport = require("passport");

// Include your authentication middleware
require("./passport");

http
  .createServer((request, response) => {
    let addr = request.url,
      q = new URL(addr, "http://" + request.headers.host),
      filePath = "";

    fs.appendFile(
      "log.txt",
      "URL: " + addr + "\nTimestamp: " + new Date() + "\n\n",
      (err) => {
        if (err) {
          console.log(err);
        } else {
          console.log("Added to log");
        }
      }
    );

    // Define routes and handle API requests
    if (q.pathname === "/login" && request.method === "POST") {
      // Use passport middleware to handle authentication
      passport.authenticate(
        "local",
        { session: false },
        (error, user, info) => {
          if (error || !user) {
            // Handle authentication failure
            return response.status(400).json({
              message: error ? error.message : "Incorrect username or password",
            });
          }
          // Handle authentication success
          req.login(user, { session: false }, (error) => {
            if (error) {
              return response.status(500).send(error);
            }
            // Generate JWT token and send response
            let token = generateJWTToken(user.toJSON());
            return response.json({ user, token });
          });
        }
      )(request, response);
    } else if (q.pathname === "/documentation") {
      filePath = __dirname + "/documentation.html";
    } else {
      filePath = "index.html";
    }

    // Read the content of the specified file asynchronously.
    fs.readFile(filePath, (err, data) => {
      if (err) {
        throw err;
      }

      // Set the response headers and send the file content to the client.
      response.writeHead(200, { "Content-Type": "text/html" });
      response.write(data);
      response.end();
    });
  })
  // Make the server listen on port 8080.
  .listen(8080);

// Log a message indicating that the server is running on port 8080.
console.log("My test server is running on Port 8080");
