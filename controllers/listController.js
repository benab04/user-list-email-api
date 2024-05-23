const List = require("../models/List.model");
const User = require("../models/User.model");
const mongoose = require("mongoose");
const axios = require("axios");
exports.createList = async (req, res) => {
  try {
    const list = await List.create(req.body);
    res.redirect(`/lists/${list._id}`);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

exports.getList = async (req, res) => {
  try {
    const list = await List.findById(req.params.id);
    const users = await User.find({ listId: req.params.id });
    res.render("manageUsers", { list, users, cookies: req.cookies });
  } catch (error) {
    res.status(500).send(error.message);
  }
};

exports.deleteList = async (req, res) => {
  try {
    const listId = new mongoose.Types.ObjectId(req.params.id);
    await User.deleteMany({ listId: listId });
    await List.findByIdAndDelete(req.params.id);
    const lists = await List.find({});
    res.redirect("/lists");
  } catch (error) {
    res.status(500).send(error.message);
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const lists = await List.find({});

    res.render("dashboard", { lists });
  } catch (error) {
    res.status(500).send(error.message);
  }
};
exports.updateFallbacks = async (req, res) => {
  const listId = req.params.id;
  const { fallbacks } = req.body;
  try {
    const list = await List.findById(listId);
    if (!list) {
      return res.render("error");
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

    res.redirect(`/lists/${listId}`);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};
exports.editList = async (req, res) => {
  const listId = req.params.id;
  const list = await List.findById(listId);
  res.render("editList", { list });
};
exports.updateList = async (req, res) => {
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
  res.redirect(`/lists/${listId}`);
  //   res.redirect(`/lists/${listId}/edit`);
};
