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
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

const app = express();
const PORT = process.env.PORT || 3000;
const mongoUser = process.env.mongoUser;
const mongoPassword = process.env.mongoPassword;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.set("view engine", "ejs");
const CONNECTION_STRING = `mongodb+srv://${mongoUser}:${mongoPassword}@cluster0.rwqcumw.mongodb.net/`;
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

const upload = multer({ dest: "uploads/" });

// Routes
app.get("/", (req, res) => {
  res.redirect("/dashboard");
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
app.get("/lists/:id/users", async (req, res) => {
  try {
    const list = await List.findById(req.params.id);
    const users = await User.find({ listId: req.params.id });
    res.render("showUsers", { list, users });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.post("/lists/:id/users", async (req, res) => {
  try {
    const list = await List.findById(req.params.id);

    // Check if the email already exists in the list
    const existingUser = await User.findOne({
      listId: list._id,
      email: req.body.email,
    });
    if (existingUser) {
      return res.status(400).send("Email already exists in this list.");
    }

    const customProperties = {};

    list.customProperties.forEach((prop) => {
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

app.post(
  "/lists/:id/users/upload",
  upload.single("csvFile"),
  async (req, res) => {
    const filePath = path.join(__dirname, req.file.path);
    const results = [];
    const errors = [];
    const listId = req.params.id;

    try {
      const list = await List.findById(listId);
      const fallbackValues = {};

      list.customProperties.forEach((prop) => {
        fallbackValues[prop.title] = prop.fallback;
      });

      const stream = fs.createReadStream(filePath).pipe(csvParser());

      let csvHeaders = [];
      let firstRow = null;

      stream.on("headers", (headers) => {
        console.log("CSV Headers:", headers);
        csvHeaders = headers;
      });

      stream.on("data", (data) => {
        if (!firstRow) {
          firstRow = data;
        }
        results.push(data);
      });

      stream.on("end", async () => {
        // Determine new custom properties from CSV headers
        const existingProperties = list.customProperties.map(
          (prop) => prop.title
        );
        const newCustomProperties = csvHeaders.filter(
          (header) =>
            header !== "name" &&
            header !== "email" &&
            !existingProperties.includes(header)
        );

        // Update the list with new custom properties
        for (let newProp of newCustomProperties) {
          const fallbackValue = firstRow[newProp] || ""; // Use first row's value as fallback or empty string if not present
          list.customProperties.push({
            title: newProp,
            fallback: fallbackValue,
          });
          fallbackValues[newProp] = fallbackValue;
        }

        await list.save();

        // Prepare CSV writer for output file
        const outputFilePath = path.join(__dirname, "output.csv");
        const csvWriter = createCsvWriter({
          path: outputFilePath,
          header: [
            ...csvHeaders.map((header) => ({ id: header, title: header })),
            { id: "Database Status", title: "Database Status" },
          ],
        });

        const outputData = [];

        let count = 1;
        // Process users from CSV
        for (let user of results) {
          console.log(count++);
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

            user["Database Status"] = "Success";
          } catch (error) {
            user["Database Status"] = `Error: ${error.message}`;
            errors.push({ user, error: error.message });
          }

          outputData.push(user);
        }

        await csvWriter.writeRecords(outputData);

        fs.unlinkSync(filePath);

        res.cookie("fileDownload", "true", { httpOnly: true });
        // Send the output file for download
        res.download(outputFilePath, "output.csv", (err) => {
          if (err) {
            res.status(500).send(err.message);
          } else {
            // Clean up the output file after sending
            fs.unlinkSync(outputFilePath);
          }
        });
      });
    } catch (error) {
      res.status(500).send(error.message);
    }
  }
);
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
