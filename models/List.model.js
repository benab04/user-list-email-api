const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const listSchema = new Schema({
  title: {
    type: String,
    required: true,
    unique: true,
  },
  customProperties: [
    {
      title: { type: String, required: true },
      fallback: { type: String, required: true },
    },
  ],
});

const Mathongolist = mongoose.model("Mathongolist", listSchema);
module.exports = Mathongolist;
