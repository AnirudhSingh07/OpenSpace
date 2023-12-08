//jshint esversion:6

require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
//const GoogleStrategy = require('passport-google-oauth20').Strategy;


const findOrCreate = require('mongoose-findorcreate');
const http = require('http'); //new
const socketio = require('socket.io');//new
const path = require('path');//new

const app = express();
//const oAuth2Client = new OAuth2Client(); //new1
//let aud; //new1


const server = http.createServer(app); //new
const io = socketio(server);//new

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "OpenSpace",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());




/*


async function audience() {
  if (!aud && (await metadata.isAvailable())) {
    let project_number = await metadata.project('numeric-project-id');
    let project_id = await metadata.project('project-id');

    aud = '/projects/' + project_number + '/apps/' + project_id;
  }

  return aud;
}

async function validateAssertion(assertion) {
  if (!assertion) {
    return {};
  }

  // Check that the assertion's audience matches ours
  const aud = await audience();

  // Fetch the current certificates and verify the signature on the assertion
  const response = await oAuth2Client.getIapPublicKeys();
  const ticket = await oAuth2Client.verifySignedJwtWithCertsAsync(
    assertion,
    response.pubkeys,
    aud,
    ['https://cloud.google.com/iap']
  );
  const payload = ticket.getPayload();

  // Return the two relevant pieces of information
  return {
    email: payload.email,
    sub: payload.sub,
  };
}






app.get('/', async (req, res) => {
  const assertion = req.header('X-Goog-IAP-JWT-Assertion');
  let email = 'None';
  try {
    const info = await validateAssertion(assertion);
    email = info.email;
  } catch (error) {
    console.log(error);
  }
  res.status(200).send(`Hello ${email}`).end();
});



*/









mongoose.connect("mongodb://127.0.0.1:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set("useCreateIndex", true);
const Message = mongoose.model('Message', { name: String, message: String });//new
const userSchema = new mongoose.Schema ({
  email: String,
  password: String,
  googleId: String
});
const postSchema = new mongoose.Schema ({
  title: String,
  content: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);
const Post = new mongoose.model("Post", postSchema); 

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

/*passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/blogs",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
*/

app.get("/", function(req, res){
  res.render("home");
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/blogs",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to blogs.
    res.redirect("/blogs");
  });

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});




app.get("/accounts",function(req,res){
  res.render("accounts");

});





app.get("/blogs", function(req, res){
  User.find({"secret": {$ne: null}}, function(err, foundUsers){
    if (err){
      console.log(err);
    } else {
      if (foundUsers) {
        res.render("blogs", {usersWithblogs: foundUsers});
      }
    }
  });
});

app.get("/all", function(req, res){

  Post.find({}, function(err, posts){
    res.render("all", {
      posts: posts
      });
  });
});

app.get("/submit", function(req, res){
  if (req.isAuthenticated()){
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", function(req, res){
//   const submittedSecret = req.body.secret;

// //Once the user is authenticated and their session gets saved, their user details are saved to req.user.
//   // console.log(req.user.id);

//   User.findById(req.user.id, function(err, foundUser){
//     if (err) {
//       console.log(err);
//     } else {
//       if (foundUser) {
//         foundUser.secret = submittedSecret;
//         foundUser.save(function(){
//           res.redirect("/blogs");
//         });
//       }
//     }
//   });
const post = new Post({
  title: req.body.postTitle,
  content: req.body.postBody
});


post.save(function(err){
  if (!err){
      res.redirect("/blogs");
  } else {
    res.redirect("/");
  }
});
});

app.get("/posts/:postId", function(req, res){

  const requestedPostId = req.params.postId;
  
    Post.findOne({_id: requestedPostId}, function(err, post){
      res.render("post", {
        title: post.title,
        content: post.content
      });
    });
  
  });

app.get("/logout", function(req, res){
  res.redirect("/");
});

app.post("/register", function(req, res){

  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/blogs");
      });
    }
  });

});

app.post("/login", function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/blogs");
      });
    }
  });

});


io.on('connection', socket => {
  console.log('a user connected');

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });

  socket.on('chat message', async msg => {
    const message = new Message(msg);
    await message.save();
    io.emit('chat message', msg);
  });
});


app.get('/index', async (req, res) => {
  const messages = await Message.find();
  res.render('index', { messages }); // Pass messages to the template
});


app.listen(3000, function() {
  console.log("Server started on port 3000.");
});

















/*
// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});
*/