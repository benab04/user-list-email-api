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
      res.json({ error: "Something went wrong!" });
    }
    res.json({ list, users });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
      return res
        .status(400)
        .json({ message: "Email already exists in this list" });
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
    res.status(200).json({ message: "User created successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
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

        res.download(outputFilePath, "output.csv", (err) => {
          if (err) {
            res.status(500).send(err.message);
          } else {
            fs.unlinkSync(outputFilePath);
          }
        });
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
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

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error(error);
    const list = await List.findById(req.params.id1);
    const users = await User.find({ listId: req.params.id1 });
    res.status(500).json({ error: error.message });
  }
};

// {
//     title: 'new',
//     customProperties: [ { title: 'country', fallback: 'india' } ]
//   }
exports.createList = async (req, res) => {
  try {
    const list = await List.create(req.body);

    res.status(200).json({ message: "List created successfully", list });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getList = async (req, res) => {
  try {
    const list = await List.findById(req.params.id);
    const users = await User.find({ listId: req.params.id });
    res.json({ list, users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteList = async (req, res) => {
  try {
    const listId = new mongoose.Types.ObjectId(req.params.id);
    await User.deleteMany({ listId: listId });
    await List.findByIdAndDelete(req.params.id);
    const lists = await List.find({});
    res.status(200).json({ message: "List deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const lists = await List.find({});

    res.json({ lists });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.updateFallbacks = async (req, res) => {
  const listId = req.params.id;
  const { fallbacks } = req.body;
  try {
    const list = await List.findById(listId);
    if (!list) {
      return res.status(500).json({ error: "Something went wrong!" });
    }

    // Update fallback values for custom properties
    list.customProperties.forEach((property) => {
      if (fallbacks[property.title]) {
        property.fallback = fallbacks[property.title];
      }
    });

    await list.save();

    // Update existing users' properties with latest fallback values
    const users = await User.find({ listId: listId });
    users.forEach(async (user) => {
      let updatedUser = user;
      let updated = false;
      list.customProperties.forEach((property) => {
        if (
          updatedUser.customProperties.has(property.title) &&
          updatedUser.customProperties.get(property.title) === "NAdefault"
        ) {
          updatedUser.customProperties.set(property.title, property.fallback);
          updated = true;
        }
      });
      if (updated) {
        await updatedUser.save();
      }
    });

    res.status(200).json({ message: "List and users successfully updated" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Something went wrong!", error: error.message });
  }
};
exports.updateList = async (req, res) => {
  try {
    const listId = req.params.id;
    await List.findByIdAndUpdate(listId, req.body);
    const list = await List.findById(listId);
    let propertiesToBeUpdated = {};
    list.customProperties.forEach((property) => {
      propertiesToBeUpdated[property.title] = property.fallback;
    });
    const users = await User.find({ listId: listId });
    users.forEach(async (user) => {
      let updatedUser = user;
      let updated = false;
      list.customProperties.forEach((property) => {
        if (updatedUser.customProperties.has(property.title)) {
          let tempFallback =
            updatedUser.customProperties.get(property.title) || "NAdefault";
          updatedUser.customProperties.set(property.title, tempFallback);
          updated = true;
        } else {
          updatedUser.customProperties.set(property.title, "NAdefault");
          updated = true;
        }
      });
      updatedUser.customProperties.forEach((value, key) => {
        if (!list.customProperties.some((property) => property.title === key)) {
          updatedUser.customProperties.delete(key);
          updated = true;
        }
      });
      if (updated) {
        await updatedUser.save();
      }
    });
    res.status(200).json({ message: "List updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
