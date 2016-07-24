const providerMap_ = {};

export default class Provider {
  getDomain() {
    throw new Error("Not implemented");
  }

  getItems(account) {
    throw new Error("Not implemented");
  }

  createApiClient(account) {
    return null;
  }

  static registerProvider(provider) {
    providerMap_[provider.getDomain()] = provider;
  }

  static getByDomain(domain) {
    return providerMap_[domain];
  }

  static addStrategy(passport) {
    return provider => passport.use(provider.getDomain(), provider.createStrategy())
  }

  static addMiddleware(app, passport) {
    return provider => {
      const strategyName = provider.getDomain();
      app.get('/connect/' + strategyName, passport.authorize(strategyName));

      app.get('/connect/' + strategyName + '/callback', passport.authorize(strategyName), (req, res) => {
        req.user.addAccount(req.account);
        req.user.saveAsync().then(() => res.redirect('/'));
      });
    };
  }
}

