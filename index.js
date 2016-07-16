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
import _ from 'lodash';
import passport from 'passport';
import csurf from 'csurf';
import {Strategy as LocalStrategy} from 'passport-local';
import {Strategy as TwitterStrategy} from 'passport-twitter';
import {Strategy as SoundCloudStrategy} from 'passport-soundcloud';
import swig from 'swig';
import Twitter from 'twitter';
const MongoStore = require('connect-mongo')(session);

const config = _.extend({}, process.env);

if (!config.PORT) {
  console.error("At least a PORT is required to use this program");
  process.exit(1);
}

const app = express();
app.use(morgan('common'));
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: false}));

const csrfProtection = csurf();

app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');

const isProduction = config.NODE_ENV === 'production';

swig.setDefaults({cache: isProduction});

if (!isProduction) {
  app.disable('etag');
}

mongoose.connect(config.MONGODB_URL);

app.use(session({
  secret: config.SESSION_SECRET,
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

passport.use('local', new LocalStrategy(
  (username, password, done) => {
    User.findOneAsync({username: username})
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

passport.use('twitter', new TwitterStrategy({
    consumerKey: config.TWITTER_CONSUMER_KEY,
    consumerSecret: config.TWITTER_CONSUMER_SECRET,
    callbackURL: config.SITE_ROOT + '/connect/twitter/callback'
  },
  function(token, tokenSecret, profile, done) {
    const account = {
      domain: 'twitter',
      userId: profile.id,
      token: token,
      tokenSecret: tokenSecret,
      profile: profile
    };
    done(null, account);
  }
));

function registerConnectors(app, strategyName) {
  app.get('/connect/' + strategyName, passport.authorize(strategyName));

  app.get('/connect/' + strategyName + '/callback', passport.authorize(strategyName), (req, res) => {
    req.user.addAccount(req.account);
    req.user.saveAsync().then(() => res.redirect('/'));
  });
}

passport.use('soundcloud', new SoundCloudStrategy({
    clientID: config.SOUNDCLOUD_CLIENT_ID,
    clientSecret: config.SOUNDCLOUD_CLIENT_SECRET,
    callbackURL: config.SITE_ROOT + '/connect/soundcloud/callback'
  },
  function(token, tokenSecret, profile, done) {
    const account = {
      domain: 'soundcloud',
      userId: profile.id,
      token: token,
      tokenSecret: tokenSecret,
      profile: profile
    };
    done(null, account);
  }
));

registerConnectors(app, 'twitter');
registerConnectors(app, 'soundcloud');

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

app.get('/login', csrfProtection, (req, res) => {
  res.render('login', {csrfToken: req.csrfToken()});
});

app.post('/login', csrfProtection, passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login?failed=yes'
}));

// XXX needs to be a reagular post handler
app.post('/signup', apiEndpoint(req => {
  const username = req.body.username;
  const password = req.body.password;
  return Promise
    .try(() => {
      if (!username) {
        throw new Error("Username is required!");
      } else if (!password) {
        throw new Error("Password is required!");
      }
    })
    .then(() => User.findOneAsync({username: username}))
    .then(maybeUser => {
      if (maybeUser) {
        throw new Error("A user with that name already exists.");
      }
      return bcrypt.hashAsync(password, null, null);
    })
    .then(passwordHash => {
      return User.createAsync({
        username: username,
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

app.get('/', (req, res) => {
  let twitterFeedP = Promise.resolve([]);
  if (req.user) {
    const apiClients = req.user.apiClients();
    if (apiClients.twitter) {
      twitterFeedP = apiClients.twitter
        .getAsync('favorites/list');
    }
  }
  twitterFeedP.then(twitterFeed => {
    res.render('index', {
      twitterFeed: twitterFeed
    });
  });
});

const accountSchema = Schema({
  domain: String,
  userId: String,
  token: String,
  tokenSecret: String,
  profile: Object
});

const userSchema = Schema({
  username: String,
  passwordHash: String,
  accounts: [accountSchema]
});

userSchema.methods.render = function() {
  return {
    username: this.username
  };
};

userSchema.methods.addAccount = function(newAccount) {
  this.accounts = [newAccount].concat(this.accounts.filter(a => a.domain !== newAccount.domain));
};

userSchema.methods.apiClients = function() {
  const apiClients = {};
  if (this.accounts) {
    this.accounts.forEach(account => {
      if (account.domain === 'twitter') {
        apiClients.twitter = Promise.promisifyAll(new Twitter({
          consumer_key: config.TWITTER_CONSUMER_KEY,
          consumer_secret: config.TWITTER_CONSUMER_SECRET,
          access_token_key: account.token,
          access_token_secret: account.tokenSecret
        }));
      }
    });
  }
  return apiClients;
}

const User = mongoose.model('User', userSchema);

const port = config.PORT;
app.listen(port, () => {
  util.log(`Listening on port ${port}`);
});

