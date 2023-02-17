const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./models/User");
const Post = require("./models/Post");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const uploadMiddleware = multer({ dest: "uploads/" });
const fs = require("fs");
const path = require("path");

const salt = bcrypt.genSaltSync(10);

app.use(cors({ credentials: true, origin: "http://localhost:3000" }));
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(__dirname + "/uploads"));

//mongoose connection
const uri = process.env.ATLAS_URI;
mongoose.set("strictQuery", false);
mongoose.connect(uri, (err) => {
  if (err) throw err;
});
const connection = mongoose.connection;
connection.once("open", () => {
  console.log("Db connection successfully");
});

app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const userDoc = await User.create({
      username,
      email,
      password: bcrypt.hashSync(password, salt),
    });
    res.json(userDoc);
  } catch (error) {
    res.status(400).json(error.message);
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const userDoc = await User.findOne({ email });
  const passOk = bcrypt.compareSync(password, userDoc.password);
  if (passOk) {
    //logged in
    jwt.sign(
      { email, id: userDoc._id },
      process.env.JWT_SECRET,
      {},
      (err, token) => {
        if (err) throw err;
        res.cookie("token", token).json({
          id: userDoc._id,
          email,
        });
      }
    );
  } else {
    res.status(400).json("Wrong Credentials");
  }
});

app.get("/profile", (req, res) => {
  const { token } = req.cookies;
  jwt.verify(token, process.env.JWT_SECRET, {}, (err, info) => {
    if (err) throw err;
    res.json(info);
  });
  res.json(req.cookies);
});

app.post("/logout", (req, res) => {
  res.cookie("token", "").json("ok");
});

app.post("/post", uploadMiddleware.single("file"), async (req, res) => {
  const { originalname, path } = req.file;
  const parts = originalname.split(".");
  const ext = parts[parts.length - 1];
  const newPath = path + "." + ext;
  fs.renameSync(path, newPath);

  const { token } = req.cookies;
  jwt.verify(token, process.env.JWT_SECRET, {}, async (err, info) => {
    if (err) throw err;
    const { title, summary, content } = req.body;
    const postDoc = await Post.create({
      title,
      summary,
      content,
      cover: newPath,
      author: info.id,
    });

    res.json(postDoc);
  });
});

app.get("/post", async (req, res) => {
  res.json(
    await Post.find()
      .populate("author", ["username"])
      .sort({ createdAt: -1 })
      .limit(20)
  );
});

app.listen(8000, () => {
  console.log("Server is Working on 8000");
});
