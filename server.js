const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true});

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});
app.use(bodyParser.urlencoded({extended: false}));

//SCHEMAS AND MODELS
const userSchema = new mongoose.Schema({
  username: {type: String, required: true}
});
const exerciseSchema = new mongoose.Schema({
  userId: {type: String, required: true},
  description: String,
  duration: Number,
  date: Date
});
const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);

//CREATE AND SAVE NEW USER
app.post("/api/users", (req, res) => {
  const newUser = new User({
    username: req.body.username
  });
  newUser.save((err, data) => {
    if (err || !data) {
      res.send("Unable to save user");
    } else {
      res.json({"username": data.username, "_id": data["_id"]});
    }
  });
});

//ADD NEW EXERCISE
app.post("/api/users/:_id/exercises", (req, res) => {
  const id = req.params["_id"];
  const {description, duration} = req.body;
  let date = req.body.date + "T12:00:00Z";
  if (!req.body.date) {//if no date provided
    date = new Date();
  }
  
  User.findById(id, (err, userData) => {
    if (err || !userData) {
      res.send("User not found");
    } else {
      const newExercise = new Exercise({
        userId: id,
        description,
        duration,
        date: new Date(date)
      });
      
      newExercise.save((err, data) => {
        if (err || !data) {
          res.send("Error saving exercise");
        } else {
          const {description, duration, date, _id} = data;
          res.json({
            username: userData.username,
            description,
            duration,
            date: date.toDateString(),
            _id: userData.id
          })
        }
      });
    }
  });

});

//GET EXERCISE LOGS
app.get("/api/users/:_id/logs", (req, res) => {
  const {from, to, limit} = req.query;
  const id = req.params["_id"];
  User.findById(id, (err, userData) => {
    if (err || !userData) {
      res.send("User not found");
    } else {
      let dateObj = {};
      if (from) {
        dateObj["$gte"] = new Date(from);
      }
      if (to) {
        dateObj["$lte"] = new Date(to);
      }
      let filter = {
        userId: id
      };
      if (from || to) {
        filter.date = dateObj;
      }
      let nonNullLim = limit ?? 50;
      Exercise.find(filter).limit(nonNullLim).exec((err, data) => {
        if (err || !data) {
          res.json([]);
        } else {
          const count = data.length;
          const rawLog = data;
          const {username, _id} = userData;
          const log = rawLog.map((l) => ({
            description: l.description,
            duration: l.duration,
            date: l.date.toDateString()
          }));
          res.json({username, count, _id, log});
        }
      });
    }
  });

});

//GET LIST OF ALL USERS
app.get("/api/users", (req, res) => {
  User.find({}, (err, data) => {
    if (err || !data) {
      res.send("No users");
    } else {
      res.json(data);
    }
  });

});

/*  //DELETE TEST USERS/EXERCISES
const delTests = () => {
  User.deleteMany({username: /test/gi}, function(err, data) {
    // use description prop for deleting exercises
    //or username prop for deleting users
    if (err) return console.error(err);
  });

};
delTests();
*/
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
