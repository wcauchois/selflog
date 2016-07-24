import Provider from './Provider';
import Twitter from 'twitter';
import Promise from 'bluebird';
import {Strategy as TwitterStrategy} from 'passport-twitter';
import Item from './Item';

class TwitterProvider extends Provider {
  getDomain() {
    return 'twitter';
  }

  getItems(account) {
    const apiClient = this.createApiClient(account);
    return apiClient
      .getAsync('favorites/list')
      .then(tweets => {
        return tweets.map(tweet => {
          return new Item({
            domain: this.getDomain(),
            date: new Date(tweet.created_at),
            props: tweet
          });
        });
      });
  }

  createApiClient(account) {
    return Promise.promisifyAll(new Twitter({
      consumer_key: process.env.TWITTER_CONSUMER_KEY,
      consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
      access_token_key: account.token,
      access_token_secret: account.tokenSecret
    }));
  }

  createStrategy() {
    return new TwitterStrategy({
        consumerKey: process.env.TWITTER_CONSUMER_KEY,
        consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
        callbackURL: process.env.SITE_ROOT + '/connect/twitter/callback'
      },
      (token, tokenSecret, profile, done) => {
        const account = {
          domain: this.getDomain(),
          userId: profile.id,
          token: token,
          tokenSecret: tokenSecret,
          profile: profile
        };
        done(null, account);
      }
    );
  }
}

const twitterProvider = new TwitterProvider();
export default twitterProvider;

Provider.registerProvider(twitterProvider);

