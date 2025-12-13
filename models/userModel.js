import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 2,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  phone: {
    type: String,
    default: "",
  },
  address: {
    type: String,
    default: "",
  },
  role: {
    type: String,
    enum: ["donor", "recipient", "admin"],
    required: true,
  },
  documents: {
    citizenship: { type: String, default: null },   // store file path or URL
    pan: { type: String, default: null },           // store file path or URL
    drivingLicense: { type: String, default: null } // store file path or URL
  },
  profilePicture: {
    type: String, default: null
  },
  bio: { type: String, default: "" },
  verified: { type: Boolean, default: false },
}, {
  timestamps: true,
});

const UsersModel = mongoose.model("Users", UserSchema);

export default UsersModel;
