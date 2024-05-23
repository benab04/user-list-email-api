const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const mathongoSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    listId: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    customProperties: { type: Map, of: String },
  },
  { timestamps: true }
);

const Users = mongoose.model("Users", mathongoSchema);

module.exports = Users;
