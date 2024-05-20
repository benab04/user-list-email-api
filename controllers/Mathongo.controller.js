const Mathongousers = require("../models/User.model.js");
const Mathongolist = require("../models/List.model.js");
const csv = require('csv-parser');
const fs = require('fs');

const addUser = async (req, res) => {
  try {
    const user = await Mathongo.create(req.body);
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await Mathongo.find({});
    res.status(200).json(users);
    console.log(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await Mathongo.findByIdAndUpdate(id, req.body);

    if (!user) {
      res.status(404).json({ message: "User not found" });
    }

    const updatedUser = await Mathongo.findById(id);
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await Mathongo.findByIdAndDelete(id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User successfully deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getUsers, updateUser, deleteUser, addUser };