const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const multer = require("multer");
const csvParser = require("csv-parser");
const methodOverride = require("method-override");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const List = require("./models/List.model");
const User = require("./models/User.model");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.set("view engine", "ejs");

mongoose
  .connect("mongodb://localhost:27017/mydatabase", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

const upload = multer({ dest: "uploads/" });

// Routes
app.get("/", (req, res) => {
  res.redirect("/lists/new");
});

app.get("/lists/new", (req, res) => {
  res.render("createList");
});

app.post("/lists", async (req, res) => {
  try {
    const list = await List.create(req.body);
    res.redirect(`/lists/${list._id}`);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get("/lists/:id", async (req, res) => {
  try {
    const list = await List.findById(req.params.id);
    const users = await User.find({ listId: req.params.id });
    res.render("manageUsers", { list, users });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.post("/lists/:id/users", async (req, res) => {
  try {
    const list = await List.findById(req.params.id);
    const customProperties = {};

    list.customProperties.forEach((prop) => {
      console.log(prop.title);
      console.log(req.body.customProperties[prop.title]);
      customProperties[prop.title] =
        req.body.customProperties[prop.title] || prop.fallback;
    });

    await User.create({
      name: req.body.name,
      email: req.body.email,
      listId: list._id,
      customProperties,
    });

    const users = await User.find({ listId: req.params.id });
    res.render("manageUsers", { list, users });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.post("/lists/:id/users/upload", upload.single("csvFile"), (req, res) => {
  const filePath = path.join(__dirname, req.file.path);
  const results = [];
  const errors = [];
  const listId = req.params.id;

  List.findById(listId)
    .then((list) => {
      const fallbackValues = {};

      list.customProperties.forEach((prop) => {
        fallbackValues[prop.title] = prop.fallback;
      });

      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on("data", (data) => {
          results.push(data);
        })
        .on("end", async () => {
          for (let user of results) {
            try {
              const customProperties = {};

              list.customProperties.forEach((prop) => {
                customProperties[prop.title] =
                  user[prop.title] || fallbackValues[prop.title];
              });

              await User.create({
                name: user.name,
                email: user.email,
                listId: list._id,
                customProperties,
              });
            } catch (error) {
              errors.push({ user, error: error.message });
            }
          }
          fs.unlinkSync(filePath);

          const users = await User.find({ listId: req.params.id });
          res.render("manageUsers", { list, users, errors });
        });
    })
    .catch((error) => {
      res.status(500).send(error.message);
    });
});
app.get("/dashboard", async (req, res) => {
  try {
    const lists = await List.find({});
    res.render("dashboard", { lists });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
