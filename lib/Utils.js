import request from 'request';
import _ from 'lodash';

export function requestJson(url, options) {
  return new Promise((resolve, reject) => {
    const finalOptions = _.extend({url: url}, options || {});
    request(finalOptions, (err, response, body) => {
      if (err) {
        reject(err);
      } else if (response.statusCode !== 200) {
        reject(new Error("Server returned non-200 response code: " + response.statusCode));
      } else {
        resolve(body);
      }
    });
  }).then(body => JSON.parse(body));
}

