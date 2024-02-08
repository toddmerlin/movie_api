// Import required modules: 'http' for creating an HTTP server,
// 'fs' for file system operations, and 'url' for URL parsing.
const http = require("http"),
  fs = require("fs"),
  url = require("url");

//The require() function allows addition of a module. First pass the module into function as its argument. Then set that whole function to a variable in your code

// Create an HTTP server using the 'http' module.
http
  .createServer((request, response) => {
    // Extract the requested URL from the request.
    let addr = request.url,
      q = new URL(addr, "http://" + request.headers.host),
      filePath = "";

    // Append the request details to a log file ('log.txt').
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

    // Determine the file path based on the pathname in the URL.
    if (q.pathname.includes("documentation")) {
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
