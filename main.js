const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

require("dotenv/config");

const authJwt = require("./helpers/jwt.js");
const errorHandler = require("./helpers/error-handler.js");

app.use(cors());
app.options("*", cors());

// Middlewares
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));
app.use(morgan("tiny"));
app.use(authJwt());
app.use("/public/uploads", express.static(__dirname + "/public/uploads"));
app.use(errorHandler);

const api = process.env.API_URL;
const categoriesRoute = require("./routes/categories.js");
const productRoute = require("./routes/products.js");
const userRoute = require("./routes/users.js");
const orderRoute = require("./routes/orders.js");

// Routes

app.use(`${api}/products`, productRoute);
app.use(`${api}/categories`, categoriesRoute);
app.use(`${api}/users`, userRoute);
app.use(`${api}/orders`, orderRoute);

const dbConfig = require("./config/database.config.js");

mongoose.Promise = global.Promise;

// Connecting to the database
mongoose
  .connect(dbConfig.url, {
    useNewUrlParser: true, // Use the new URL string parser
    useUnifiedTopology: true, // Use the new Server Discover and Monitoring engine
    useCreateIndex: true, // Deprecation of ensureIndex
    useFindAndModify: false, // Deprecation of findAndModify
  })
  .then(() => {
    console.log("Successfully connected to the database");
  })
  .catch((err) => {
    console.log("Could not connect to the database. Exiting now...", err);
    process.exit();
  });

// listen for requests
app.listen(3000, () => {
  console.log("Server is listening on port 3000");
});
