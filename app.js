const express = require("express");
const path = require("path");
const app = express();
const bodyParser = require("body-parser");
const cookieparser = require("cookie-parser");
const csrf = require("csurf");
const ConnectEnsureLogin = require("connect-ensure-login");
const expresssession = require("express-session");
const bcrypt = require("bcrypt");
const flash = require("connect-flash");
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const mongoose = require("mongoose");

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieparser("shh! some secret string"));

const  user =require("./public/user"); 
const sports= require("./public/sports");
const session=require("./public/session");


app.use(express.json());
app.set("view engine", "ejs");

app.use(
    expresssession({
        secret: "My-secret-key-1515464651315646115316",
        cookie: {
            maxAge: 24 * 60 * 60 * 1000,
        },
    })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(csrf({ cookie: true }));
app.use(flash());
app.use(function (request, response, next) {
    response.locals.messages = request.flash();
    next();
});

passport.use(
    new LocalStrategy(
        {
            usernameField: "email",
            passwordField: "password",
        },
        (email, password, done) => {
            console.log("Finding user...");
            user.findOne({ email: email })
                .then(async (user) => {
                    if (user) {
                        console.log("User found");
                        const result = await bcrypt.compare(password, user.password);
                        if (result) {
                            return done(null, user);
                        } else {
                            return done(null, false, { message: "Invalid Password" });
                        }
                    } else {
                        return done(null, false, { message: "Email not registered" });
                    }
                })
                .catch((error) => {
                    console.log("Authentication failed");
                    return done(error);
                });
        }
    )
);

const salRounds = 10;

passport.serializeUser((user, done) => {
  console.log("Serializing user in session: ", user.id);
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  console.log("Deserializing user from session: ", id);
  user.findById(id)
    .then((user) => {
      done(null, user);
    })
    .catch((err) => {
      done(err, null);
    });
});

app.get("/", (request, response) => {
  if (request.isAuthenticated()) {
    if (request.user.role == "admin") {
      response.redirect("/admin");
    } else {
      response.redirect("/user");
    }
  } else {
    response.render("index", {
      failure: false,
      csrfToken: request.csrfToken(),
    });
  }
});

app.post("/users", async (request, response) => {
  console.log("/users is called");

  const checkedButton = request.body.role;
  console.log(checkedButton);

  const hashPwd = await bcrypt.hash(request.body.password, salRounds);
  console.log(hashPwd);

  if (!request.body.firstname || !request.body.email || !request.body.password) {
    request.flash("error", "Please fill in all the required fields.");
    return response.redirect("/signup");
  }

  try {
    const newUser = await  user.create({
      fname: request.body.firstname,
      lname: request.body.lastname,
      email: request.body.email,
      password: hashPwd,
      role: checkedButton,
      sessionId: [0],
    });

    console.log(newUser);

    request.login(newUser, (err) => {
      if (err) {
        console.log("Error logging in", err);
        response.redirect("/");
      }

      if (checkedButton === "admin") {
        response.redirect("/admin");
      } else if (checkedButton === "player") {
        response.redirect("/user");
      } else {
        response.redirect("/");
      }
    });
  } catch (error) {
    console.log("Email already registered!", error);
    response.render("signup", {
      failure: true,
      csrfToken: request.csrfToken(),
    });
  }
});

app.get("/login", (request, response) => {
  if (request.isAuthenticated()) {
    if (request.user.role == "admin") {
      response.redirect("/admin");
    } else {
      response.redirect("/user");
    }
  } else {
    response.render("signin", {
      csrfToken: request.csrfToken(),
    });
  }
});

app.get("/signout", (request, response, next) => {
  console.log("/signout is called");
  request.logout((err) => {
    if (err) {
      return next(err);
    }
    response.redirect("/");
  });
});

app.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  async (request, response) => {
    console.log(request.user);
    console.log("/session is called");
    const loggedinUser = request.user.id;
    console.log(loggedinUser);

    if (request.user.role == "admin") {
      response.redirect("/admin");
    }
    if (request.user.role == "player") {
      response.redirect("/user");
    }
  }
);

app.get("/signup", (request, response) => {
  response.render("signup", {
    failure: false,
    csrfToken: request.csrfToken(),
  });
});

app.get(
  "/admin",
  ConnectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const loggedinUser = request.user.id;
    console.log("UserID"+loggedinUser);
    const allSports = await sports.getSportByUserId(loggedinUser);
    const getUser = await user.getUser(loggedinUser);

    if (request.accepts("HTML")) {
      response.render("useradmin", {
        getUser,
        allSports,
        csrfToken: request.csrfToken(),
      });
    } else {
      response.json({
        getUser,
        allSports,
      });
    }
  }
);


app.get(
  "/user",
  ConnectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const loggedinUser = request.user.id;
    console.log(loggedinUser);
    const allSports = await sports.getSports();
    const getUser = await user.getUser(loggedinUser);
    
    response.render("player", {
      getUser,
      allSports,
      csrfToken: request.csrfToken(),
    });
  }
);

app.get(
  "/createsport",
  ConnectEnsureLogin.ensureLoggedIn(),
  (request, response) => {
    response.render("createSport", {
      sportcreated: false,
      csrfToken: request.csrfToken(),
    });
  }
);

app.post(
  "/createsport",
  ConnectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      console.log(
        request.body,
        await sports.findSportByName(request.body.sport, request.user.id)
      );
      var sportName = await sports.findSportByName(
        request.body.sport,
        request.user.id
      );
      if (!sportName) {
        response.render("createsport", {
          sportcreated: true,
          csrfToken: request.csrfToken(),
        });
      } else {
        const sport = await sports.createsports({
          sport: request.body.sport,
          userId: request.user.id,
        });
        const allSessions = await session.getSessions({
          sportname: sport.id,
          userId: request.user.id,
        });
        const getUser = await user.getUser(request.user.id);
        console.log(sport.id);
        response.render("sportsessions", {
          user: "admin",
          getUser,
          name: request.body.sport,
          sportID: sport.id,
          allSessions,
          csrfToken: request.csrfToken(),
        });
      }
    } catch (error) {
      console.log(error);
    }
  }
);

app.get(
  "/sportsession",
  ConnectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    console.log(request.body.id);
    const getUser = await user.getUser(request.user.id);
    const sport = await sports.getSportByUserId(request.user.id);
    //console.log(sport)
    //const allSessions = await session.getSessions(sport.sport_name);
    response.render("sportsessions", {
      getUser,
      name: sport.sport_name,
      sportID: sport.id,
      csrfToken: request.csrfToken(),
    });
  }
);
app.get(
  "/sportsession/:id",
  ConnectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    console.log(request.params.id);
    const sport = await sports.findSportById(
      request.params.id,
      request.user.id
    );
    console.log(sport);
    const allSessions = await session.getAllSessions({
      sportname: sport.id,
      userId: request.user.id,
    });
    console.log(allSessions);
    const getUser = await user.getUser(request.user.id);
    response.render("sportsessions", {
      getUser,
      name: sport.sport_name,
      sportID: sport.id,
      allSessions,
      csrfToken: request.csrfToken(),
    });
  }
);

app.delete(
  `/sportsession`,
  ConnectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    console.log("We have to delete a Sport with ID: ", request.body.id);
    // FILL IN YOUR CODE HERE

    try {
      const deleteSport = await sports.deleteSport(request.body.id);
      await session.deleteSession(request.body.id, request.user.id);
      console.log(deleteSport);
      return response.send(deleteSport ? true : false);
    } catch (error) {
      console.log(error, response.status);
      return response.status(422).send(error);
    }
  }
);
app.get(
  "/createsession/:id",
  ConnectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const getUser = await user.getUser(request.user.id);
    const sport = await sports.findSportById(request.params.id);
    if (request.accepts("HTML")) {
      response.render("createsession", {
        sportId: sport,
        getUser,
        csrfToken: request.csrfToken(),
      });
    } else {
      response.json({
        sportId: request.params.id,
        getUser,
        csrfToken: request.csrfToken(),
      });
    }
  }
);
app.post(
  "/createsession",
  ConnectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    var playerArray = request.body.playername.split(",");
    const sportname = await sports.findSportById(request.body.sportname);
    console.log(request.body.dateTime, new Date().toISOString());
    try {
      if (playerArray.length > request.body.noPlayer) {
        request.flash("error", "No. of PLayers Exceeded!");
        response.redirect(`/createsession/${sportname.id}`);
      }
      if (request.body.dateTime < new Date().toISOString()) {
        request.flash("error", "Date should not be less than today date!");
        response.redirect(`/createsession/${sportname.id}`);
      } else if (!(playerArray.length > request.body.noPlayer)) {
        //console.log(session);
        await session.addSession({
          sportname: sportname.id,
          dateTime: request.body.dateTime,
          address: request.body.address,
          players: playerArray,
          userId: request.user.id,
          noplayers: request.body.noPlayer,
          sessioncreated: true,
        });
        response.redirect(`/sportsession/${sportname.id}`);
        //const allSessions = await session.getSessions({ sportname: sportname.sport_name, userId: request.user.id});
      }
    } catch (error) {
      console.log(error);
    }
  }
);

app.get(
  "/session/:id",
  ConnectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const getUser = await user.getUser(request.user.id);
    const allSessions = await session.getSessionById(request.params.id);
    const sport = await sports.findSportById(allSessions.sportname);
    //console.log(request);
    //console.log(getUser.sessionId);
    response.render("session", {
      getUser,
      allSessions,
      sport,
      previous: false,
      csrfToken: request.csrfToken(),
    });
  }
);

app.get(
  "/session",
  ConnectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const getUser = await user.getUser(request.user.id);
    const allSessions = await session.getAllSessionsTest({ sportname: 1 });
    if (request.accepts("HTML")) {
      response.render("session", {
        getUser,
        allSessions,
        previous: false,
        user: request.user.role,
        csrfToken: request.csrfToken(),
      });
    } else {
      response.json({
        getUser,
        allSessions,
        user: request.user.role,
      });
    }
  }
);

app.put(
  "/session/:playername/:id",
  ConnectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const sessions = await session.findByPk(request.params.id);
    console.log(sessions);
    try {
      const updatedplayer = await session.removePlayer(
        request.params.playername,
        request.params.id
      );
      if (
        request.user.sessionId.includes(sessions.id) &&
        request.user.fname == request.params.playername
      ) {
        await user.removeSessionId(sessions.id, request.user.id);
      }
      return response.json(updatedplayer);
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.put(
  "/cancelsession",
  ConnectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    console.log(request.body);
    try {
      const canceledSession = await session.cancelSession(request.user.id);
      // const sportId = await sports.findAll({
      //   where: {
      //     sport_name: request.body.sportname,
      //   },
      // });
      console.log(canceledSession);
      response.send(canceledSession);
    } catch (error) {
      console.log(error);
    }
  }
);
app.put("/addPlayer", async (request, response) => {
  try {
    const addPlayer = await session.addPlayer(
      request.body.id,
      request.body.playername
    );
    //console.log(request.body);
    const addSessionId = await user.AddsessionIdinuser(
      request.body.id,
      request.user.id
    );
    console.log(addPlayer, addSessionId);
    response.send(addPlayer);
  } catch (error) {
    console.log(error);
  }
});

app.get(
  "/previoussessions/:sportId",
  ConnectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const getUser = await user.getUser(request.user.id);
    const allSessions = await session.getPreviousSessions(
      request.params.sportId
    );
    const getSports = await sports.findSportById(request.params.sportId);
    response.render("previoussessions", {
      getUser,
      allSessions,
      getSports,
      name: "cricket",
      csrfToken: request.csrfToken(),
    });
  }
);

app.get(
  "/previoussession/:id",
  ConnectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const getUser = await user.getUser(request.user.id);
    const allSessions = await session.getPreviousSessions(request.params.id);
    response.render("previoussession", {
      getUser,
      allSessions,
    });
  }
);


module.exports = app;