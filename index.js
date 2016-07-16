import express from 'express';
import morgan from 'morgan';
import Promise from 'bluebird';
import bodyParser from 'body-parser';
import request from 'request';
import util from 'util';
const mongoose = Promise.promisifyAll(require('mongoose'));
const Schema = mongoose.Schema; 
import path from 'path';
const bcrypt = Promise.promisifyAll(require('bcrypt-nodejs'));
import session from 'express-session';
import passport from 'passport';
import {Strategy as LocalStrategy} from 'passport-local';
import {Strategy as TwitterStrategy} from 'passport-twitter';
const MongoStore = require('connect-mongo')(session);

if (!process.env.PORT) {
  console.error("At least a PORT is required to use this program");
  process.exit(1);
}

const app = express();
app.use(morgan('common'));
app.use(express.static('dist'));
app.use(bodyParser.urlencoded({extended: false}));

mongoose.connect(process.env.MONGODB_URL);

app.use(session({
  secret: process.env.SESSION_SECRET,
  store: new MongoStore({mongooseConnection: mongoose.connection}),
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findByIdAsync(id).asCallback(done);
});

passport.use(new LocalStrategy(
  (name, password, done) => {
    User.findOneAsync({name: name})
      .then(user => {
        if (!user) {
          return [false, {message: "Invalid username or password."}];
        } else {
          return bcrypt.compareAsync(password, user.passwordHash).then(result => [result, user]);
        }
      })
      .spread((result, user) => {
        if (result) {
          return [user];
        } else {
          return [false, {message: "Incorrect username or password."}];
        }
      })
      .asCallback(done, {spread: true});
  }
));

if (process.env.NODE_ENV !== 'production') {
  app.set('etag', false);
}

function apiEndpoint(handlerP) {
  return (req, res) => {
    handlerP(req)
      .then(result => res.json(result))
      .caught(e => {
        console.error(e.stack);
        return res.status(500).send({"error": e.message});
      });
  };
}

app.get('/api/session', apiEndpoint(req => {
}));

app.post('/api/signup', apiEndpoint(req => {
  var name = req.body.name;
  var password = req.body.password;
  return Promise
    .try(() => {
      if (!name) {
        throw new Error("Name is required!");
      } else if (!password) {
        throw new Error("Password is required!");
      }
    })
    .then(() => User.findOneAsync({name: name}))
    .then(maybeUser => {
      if (maybeUser) {
        throw new Error("A user with that name already exists.");
      }
      return bcrypt.hashAsync(password, null, null);
    })
    .then(passwordHash => {
      return User.createAsync({
        name: name,
        passwordHash: passwordHash
      });
    }).then(user => {
      return Promise.fromCallback(callback => {
        return req.login(user, callback);
      }).then(() => user)
    }).then(user => {
      return {
        "user": user.render()
      };
    });
}));

app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
});

const userSchema = Schema({
  name: String,
  passwordHash: String
});

userSchema.methods.render = function() {
  return {
    name: this.name
  };
};

var User = mongoose.model('User', userSchema);

const port = process.env.PORT;
app.listen(port, () => {
  util.log(`Listening on port ${port}`);
});

