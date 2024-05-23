const User = require("../models/User.model");
const List = require("../models/List.model");
const mongoose = require("mongoose");
const csvParser = require("csv-parser");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const upload = multer({ dest: "uploads/" });

exports.getUsers = async (req, res) => {
  try {
    const list = await List.findById(req.params.id);
    const users = await User.find({ listId: req.params.id });
    if (!list) {
      res.render("error");
    }
    res.render("showUsers", { list, users });
  } catch (error) {
    res.status(500).send(error.message);
  }
};

exports.createUser = async (req, res) => {
  try {
    const list = await List.findById(req.params.id);

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
};

exports.uploadUsers = [
  upload.single("csvFile"),
  async (req, res) => {
    const filePath = path.join(__dirname, "../", req.file.path);
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
        csvHeaders = headers.map((header) => header.replace(/\./g, "_"));
      });

      stream.on("data", (data) => {
        const sanitizedData = {};
        for (let key in data) {
          sanitizedData[key.replace(/\./g, "_")] = data[key];
        }
        if (!firstRow) {
          firstRow = Object.fromEntries(
            Object.entries(sanitizedData).map(([key, value]) => [
              key,
              "NAdefault",
            ])
          );
        }
        results.push(sanitizedData);
      });

      stream.on("end", async () => {
        const existingProperties = list.customProperties.map(
          (prop) => prop.title
        );
        const newCustomProperties = csvHeaders.filter(
          (header) =>
            header !== "name" &&
            header !== "email" &&
            !existingProperties.includes(header)
        );

        for (let newProp of newCustomProperties) {
          const fallbackValue =
            list.customProperties[newProp.title] || firstRow[newProp];

          list.customProperties.push({
            title: newProp,
            fallback: fallbackValue,
          });
          fallbackValues[newProp] = fallbackValue;
        }
        await list.save();

        const outputFilePath = path.join(__dirname, "../output.csv");
        const csvWriter = createCsvWriter({
          path: outputFilePath,
          header: [
            ...csvHeaders.map((header) => ({ id: header, title: header })),
            { id: "Database Status", title: "Database Status" },
          ],
        });

        const outputData = [];
        for (let user of results) {
          try {
            const customProperties = {};

            list.customProperties.forEach((prop) => {
              customProperties[prop.title] =
                user[prop.title] || fallbackValues[prop.title];
            });

            // Ensure all values are strings
            const customPropertiesMap = new Map(
              Object.entries(customProperties).map(([key, value]) => [
                key,
                value.toString(),
              ])
            );

            const existingUser = await User.findOne({
              listId: listId,
              email: user.email,
            });
            if (!existingUser) {
              await User.create({
                name: user.name,
                email: user.email,
                listId: list._id,
                customProperties: customPropertiesMap,
              });

              user["Database Status"] = "Success";
            } else {
              user["Database Status"] = "Error: Email already exists in list";
            }
          } catch (error) {
            console.error("Error creating user:", error);
            user["Database Status"] = `Error: ${error.message}`;
            errors.push({ user, error: error.message });
          }
          // Ensure output data contains fallback values where necessary
          const outputUser = { ...user };
          csvHeaders.forEach((header) => {
            if (!user[header]) {
              outputUser[header] = fallbackValues[header];
            }
          });
          outputData.push(outputUser);
        }

        await csvWriter.writeRecords(outputData);

        fs.unlinkSync(filePath);

        res.cookie("fileDownload", "true", { maxAge: 10000, httpOnly: true });
        res.download(outputFilePath, "output.csv", (err) => {
          if (err) {
            res.status(500).send(err.message);
          } else {
            fs.unlinkSync(outputFilePath);
          }
        });
      });
    } catch (error) {
      res.status(500).send(error.message);
    }
  },
];
exports.deleteUser = async (req, res) => {
  const { id1: listId, id2: userId } = req.params;
  if (
    !mongoose.Types.ObjectId.isValid(listId) ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    return res.status(400).send("Invalid ID format");
  }

  try {
    const list = await List.findById(listId);
    if (!list) {
      return res.status(404).send("List not found");
    }

    const user = await User.findOneAndDelete({
      _id: userId,
      listId: new mongoose.Types.ObjectId(listId),
    });

    res.redirect(`/lists/${listId}/users`);
  } catch (error) {
    console.error(error);
    const list = await List.findById(req.params.id1);
    const users = await User.find({ listId: req.params.id1 });
    res.status(500).render("showUsers", { list, users });
  }
};
