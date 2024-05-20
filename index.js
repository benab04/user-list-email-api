const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const MathongoRoutes = require("./routes/Mathongo.routes.js");
require("dotenv").config();
const PORT = process.env.PORT || 5000;
const mongoUser = encodeURIComponent(process.env.mongoUser);
const mongoPassword = encodeURIComponent(process.env.mongoPassword);
const CONNECTION_STRING = `mongodb+srv://${mongoUser}:${mongoPassword}@cluster0.rwqcumw.mongodb.net/`;
mongoose
  .connect(CONNECTION_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to Database");
    app.listen(PORT, () => {
      console.log(`Sever running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("Error in connecting to Database");
  });

const app = express();

app.use(morgan("dev"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use("/api/users", MathongoRoutes);

app.get("/", async (req, res) => {
  res.json("Hello");
});
