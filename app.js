const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();

const path = require("path");
const dbPath = path.join(__dirname, "userData.db");
app.use(express.json());
const bcrypt = require("bcrypt");
let db = null;
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error:${e.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

const validateUserPassword = (password) => {
  return password.length > 5;
};

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserDetails = `
    SELECT *
    FROM user
    WHERE username='${username}';`;
  const dbUser = await db.get(selectUserDetails);

  if (dbUser === undefined) {
    const createUserDetails = `
        INSERT INTO
        user(username, name, password, gender, location)
        VALUES
        (
            '${username}',
            '${name}',
            '${hashedPassword}',
            '${gender}',
            '${location}'
        );`;
    if (validateUserPassword(password)) {
      await db.run(createUserDetails);
      response.send("User created Successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("user already exists");
  }
});

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserDetails = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(selectUserDetails);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      response.send("Login Success");
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  }
});

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const selectUserDetails = `SELECT * FROM user WHERE username='${username}';`;
  const dbUser = await db.get(selectUserDetails);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      oldPassword,
      dbUser.password
    );
    if (isPasswordMatched === true) {
      if (validateUserPassword(newPassword)) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updatePasswordDetails = `
                UPDATE user
                SET password='${hashedPassword}'
                WHERE username ='${username}';`;
        const user = await db.run(updatePasswordDetails);
        response.send("Password updated");
      } else {
        response.status(400);
        response.send("Password is too short");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
