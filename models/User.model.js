const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const mathongoSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
    },
    city: {
      type: String,
      default: "Bengaluru",
    },
  },
  { timestamps: true }
);

const Mathongousers = mongoose.model("Mathongousers", mathongoSchema);

module.exports = Mathongousers;
