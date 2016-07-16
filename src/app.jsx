import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import {List, Map, fromJS} from 'immutable';
import {Router, Link, Route, browserHistory} from 'react-router';
import {createStore} from 'redux';
import {Provider, connect} from 'react-redux';
import _ from 'lodash';
import classNames from 'classnames';
import axios from 'axios';

function reducer(state = Map({}), action) {
  if (action.type === 'EXAMPLE') {
    return state; // TODO
  } else {
    return state;
  }
}

const actionCreators = {
  example() {
    return {type: 'EXAMPLE'};
  }
};

const store = createStore(reducer);

class UsernamePasswordControl extends Component {
  render() {
    return <div className="form-horizontal">
      <div className="form-group">
        <label htmlFor="username" className="col-md-2 control-label">Username</label>
        <div className="col-md-4">
          <input type="text" className="form-control" id="username" placeholder="Username" />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="password" className="col-md-2 control-label">Password</label>
        <div className="col-md-4">
          <input type="text" className="form-control" id="password" placeholder="Password" />
        </div>
      </div>
      <button type="submit" className="btn btn-default"
        onClick={() => this.props.onSubmit && this.props.onSubmit()}>{this.props.actionText}</button>
    </div>;
  }
}

class LoginPage extends Component {
  doSignup() {
  }

  render() {
    return <div>
      <div className="row">
        <div>
          <h1>Log In</h1>
          <UsernamePasswordControl actionText="Login" />
          <h1>Register</h1>
          <UsernamePasswordControl actionText="Sign up" onSubmit={() => this.doSignup()} />
        </div>
      </div>
    </div>;
  }
}

class HomePage extends Component {
  render() {
    return <div>
      Hello world<br />
      Click <Link to="/login">here</Link> to log-in.
    </div>;
  }
}

class App extends Component {
  render() {
    return <div className="container">
      {this.props.children}
    </div>;
  }
}

const routes = <Route component={App}>
  <Route path="/" component={HomePage} />
  <Route path="/login" component={LoginPage} />
</Route>;

ReactDOM.render(
  <Provider store={store}>
    <Router history={browserHistory}>{routes}</Router>
  </Provider>,
  document.getElementById('app')
);

