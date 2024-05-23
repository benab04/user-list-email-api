const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const methodOverride = require("method-override");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const listRoutes = require("./routes/listRoutes");
const userRoutes = require("./routes/userRoutes");
const apiRoutes = require("./routes/apiRoutes");
const List = require("./models/List.model");

const app = express();
const PORT = process.env.PORT || 5000;
const mongoUser = process.env.mongoUser;
const mongoPassword = process.env.mongoPassword;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(cookieParser());
app.set("view engine", "ejs");

const CONNECTION_STRING = `mongodb+srv://${mongoUser}:${mongoPassword}@cluster0.rwqcumw.mongodb.net/UserListManagement?retryWrites=true&w=majority`;

mongoose
  .connect(CONNECTION_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

app.get("/", (req, res) => {
  res.redirect("/lists");
});

app.use("/lists", listRoutes);
app.use("/lists", userRoutes);
app.use("/api/lists", apiRoutes);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
