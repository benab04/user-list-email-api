const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const mathongoSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    listId: {
      type: Schema.Types.ObjectId,
      ref: "Mathongolist",
      required: true,
    },
    customProperties: { type: Map, of: String },
  },
  { timestamps: true }
);

const Mathongousers = mongoose.model("Mathongousers", mathongoSchema);

module.exports = Mathongousers;
