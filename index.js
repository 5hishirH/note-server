const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

// middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// custom middleware
const logger = async (req, res, next) => {
  console.log(req.hostname, req.url);
  next();
};

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// create a function to verify token
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  // console.log('value of token middleware', token);
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err);
      return res.status(401).send({ message: "unauthorized access" });
    }
    // console.log('decoded token middleware', decoded);
    req.user = decoded;
    next();
  });
};

app.get("/", (req, res) => {
  res.send("Hello World!");
});

const database = client.db("MyNote");
const notes = database.collection("notes");
const userCollection = database.collection("users");

app.post("/users", logger, async (req, res) => {
  const user = req.body;
  const { email } = user;
  const result = await userCollection.findOne({ email: email });
  if (!result) {
    await userCollection.insertOne({ email, username, profilePic });
  }
  const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1h",
  });

  res
    .cookie("token", token, {
      httpOnly: true,
      secure: false, //in case of http -> false & in case of https -> true
      //sameSite : 'none' //if backend and frontend run from different port
    })
    .send({ success: true });
});

app.post("/logout", async (req, res) => {
  const user = req.body;
  console.log("logging out", user);
  res.clearCookie("token", { maxAge: 0 }).send({ success: true });
});

app.get("/notes", logger, verifyToken, async (req, res) => {
  const { email } = req.user;
  console.log(email);
  const result = await notes.find({ userEmail: email }).toArray();
  res.send(result);
});

app.post("/notes", logger, verifyToken, async (req, res) => {
  try {
    const newNote = req.body;
    await notes.insertOne(newNote);
    res.send("Note created successfully");
  } catch (e) {
    res.send("Failed to create a new note");
  }
});

app.delete("/notes/:id", logger, verifyToken, async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  await notes.deleteOne(query);
  res.send("The note is deleted successfully");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
