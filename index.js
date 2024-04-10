const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jsonwebtoken = require("jsonwebtoken");


const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "testDb.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(5000, () => {
      console.log("Server Running at http://localhost:5000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

//authentication
const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "token", async (error, payLoad) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.headers.username = payLoad.username;
        next();
      }
    });
  }
};

//signup a user
app.post("/signup/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const hashPassword = await bcrypt.hash(password, 10);
  const usernameQuery = `SELECT * FROM user WHERE username = '${username}';`;

  const userExist = await db.get(usernameQuery);

  if (userExist === undefined) {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      addUserQuery = `INSERT INTO user (username,password,name,gender)
      VALUES ('${username}','${hashPassword}','${name}','${gender}');`;
      const addUser = await db.run(addUserQuery);
      response.status(200);
      response.send("User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//login user
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const checkUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const checkUser = await db.get(checkUserQuery);

  if (checkUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isCorrectPassword = await bcrypt.compare(
      password,
      checkUser.password
    );
    if (isCorrectPassword) {
      response.status(200);
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//create dairy
app.post("/dairy/", authenticateToken, async (request, response) => {
  const { id,title,desc,date,location,imgurl } = request.body;
  const dairyQuery = `
    INSERT INTO
        dairy(tweet, user_id)
    VALUES ('${id}' '${title}','${desc}','${date}','${location}','${imgurl}');`;
  await db.run(dairyQuery);
  response.send("Posted in Dairy");
});

//get all from diary
app.get("/dairy/", authenticateToken, async (request, response) =>{
    const getallDairy = `SELECT * FROM dairy;`;
    const queryRes = await db.all(getallDairy);
    response.send(queryRes);
});

//get dairy by id

app.get("/dairy/:id/",authenticateToken, async (request, response) =>{
    const { id } = request.params;
const dairyquery = `SELECT * FROM dairy WHERE id = ${id};`;
const queryRes = await db.get(dairyquery);
response.send(queryRes);
});

//update any diary details
app.put("/dairy/:id/",authenticateToken, async (request, response) => {
  const { id } = request.params;
  const { title,desc,date,location,imgurl } = request.body;
  const updateQuery = `UPDATE dairy SET title = '${title}' ,desc = '${desc}' ,date = '${date}' ,location = '${loaction}' ,imgurl = '${imgurl}';`;
  const updateDairy = await db.run(updateQuery);
  response.send("Dairy Details Updated");
});

//delete a dairy detail
app.delete("/dairy/:id/", authenticateToken, async (request, response) => {
  const { id } = request.params;
  const deleteQuery = `DELETE FROM dairy WHERE id = ${id};`;
  const deleteDairy = db.run(deleteQuery);
  response.send("Dairy Item Removed");
});

module.exports = app;
