const mongoose = require("mongoose");
const { Schema, model } = mongoose;
const UserSchema = new Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    min: 3,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
    trim: true,
  },
});

const UserModel = model("User", UserSchema);
module.exports = UserModel;
