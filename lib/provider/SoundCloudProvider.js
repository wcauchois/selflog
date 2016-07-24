import Provider from './Provider';
import {requestJson} from '../Utils';
import {Strategy as SoundCloudStrategy} from 'passport-soundcloud';
import Item from './Item';

class SoundCloudProvider extends Provider {
  getDomain() {
    return 'soundcloud';
  }

  getFavorites(account) {
    return requestJson('https://api.soundcloud.com/me/favorites', {
      qs: {
        'client_id': account.tokenSecret,
        'limit': 20
      },
      headers: {
        'Authorization': 'OAuth ' + account.token
      }
    });
  }

  getItems(account) {
    return this.getFavorites(account)
      .then(tracks => {
        return tracks.map(track => {
          return new Item({
            domain: this.getDomain(),
            date: new Date(track.created_at),
            props: track
          });
        });
      });
  }

  createStrategy() {
    return new SoundCloudStrategy({
        clientID: process.env.SOUNDCLOUD_CLIENT_ID,
        clientSecret: process.env.SOUNDCLOUD_CLIENT_SECRET,
        callbackURL: process.env.SITE_ROOT + '/connect/soundcloud/callback'
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
    );
  }
}

const soundCloudProvider = new SoundCloudProvider();
export default soundCloudProvider;

Provider.registerProvider(soundCloudProvider);

