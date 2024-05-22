const List = require("../models/List.model");
const User = require("../models/User.model");
const mongoose = require("mongoose");

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
      res.render("error");
    }

    list.customProperties.forEach((property) => {
      if (fallbacks[property.title]) {
        property.fallback = fallbacks[property.title];
      }
    });

    await list.save();

    res.redirect(`/lists/${listId}`);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};
