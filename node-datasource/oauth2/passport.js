/*jshint node:true, indent:2, curly:false, eqeqeq:true, immed:true, latedef:true, newcap:true, noarg:true,
regexp:true, undef:true, strict:true, trailing:true, white:true */
/*global X:true, XM:true, _:true, console:true*/

/**
 * Module dependencies.
 */
var passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    BasicStrategy = require('passport-http').BasicStrategy,
    ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy,
    ClientJWTBearerStrategy = require('passport-oauth2-jwt-bearer').Strategy,
    BearerStrategy = require('passport-http-bearer').Strategy,
    db = require('./db'),
    privateSalt = X.fs.readFileSync(X.options.datasource.saltFile).toString();


/**
 * LocalStrategy
 *
 * This strategy is used to authenticate users based on a username and password.
 * Anytime a request is made to authorize an application, we must ensure that
 * a user is logged in before asking them to approve the request.
 */
passport.use(new LocalStrategy(
  {
    usernameField: 'id',
    passwordField: 'password'
  },
  function (username, password, done) {
    "use strict";

    db.users.findByUsername(username, function (err, user) {
      if (err) { return done(err); }
      if (!user) {
        return done(null, false);
      }
      if (!X.bcrypt.compareSync(password, user.get('password'))) {
        return done(null, false);
      }
      return done(null, user);
    });
  }
));


/**
 * Set Session Cookie to be returned to the XTPGStore as XM.SessionStore and
 * persist as a valid session to XM.Session in the database.
 */
passport.serializeUser(function (user, done) {
  "use strict";

  var passportUser = {};

  passportUser.id = user.get("id");
  done(null, passportUser);
});


/**
 * Check Session Cookie against the database.
 */
passport.deserializeUser(function (passportUser, done) {
  "use strict";

  db.users.findByUsername(passportUser.id, function (err, user) {
    if (err) { return done(err); }
    if (!user) {
      return done(null, false);
    }
    return done(null, user);
  });
});


/**
 * BasicStrategy & ClientPasswordStrategy
 *
 * These strategies are used to authenticate registered OAuth clients.  They are
 * employed to protect the `token` endpoint, which consumers use to obtain
 * access tokens.  The OAuth 2.0 specification suggests that clients use the
 * HTTP Basic scheme to authenticate.  Use of the client password strategy
 * allows clients to send the same credentials in the request body (as opposed
 * to the `Authorization` header).  While this approach is not recommended by
 * the specification, in practice it is quite common.
 */
passport.use(new BasicStrategy(
  function (username, password, done) {
    "use strict";

    db.clients.findByClientId(username, function (err, client) {
      if (err) { return done(err); }
      if (!client) { return done(null, false); }
      if (client.get("clientSecret") !== password) { return done(null, false); }
      return done(null, client);
    });
  }
));

passport.use(new ClientPasswordStrategy(
  function (clientId, clientSecret, done) {
    "use strict";

    db.clients.findByClientId(clientId, function (err, client) {
      if (err) { return done(err); }
      if (!client) { return done(null, false); }
      if (client.get("clientSecret") !== clientSecret) { return done(null, false); }
      return done(null, client);
    });
  }
));


/**
 * JSON Web Token (JWT) Bearer Strategy
 *
 * This strategy authenticates clients using a JWT's Claim Set's "iss" value. The "iss"
 * is extracted from the JWT so a matching client can be looked up.  You do not need
 * to validate the JWT with the signature.  That will be done by the JSON Web Token (JWT)
 * Bearer Token Exchange Middleware for OAuth2orize.  We will just look up a matching
 * client and pass it along to the exhange middleware for full validation.
 */
passport.use(new ClientJWTBearerStrategy(
  function (claimSetIss, done) {
    "use strict";

    db.clients.findByClientId(claimSetIss, function (err, client) {
      if (err) { return done(err); }
      if (!client) { return done(null, false); }
      return done(null, client);
    });
  }
));

/**
 * BearerStrategy
 *
 * This strategy is used to authenticate users based on an access token (aka a
 * bearer token).  The user must have previously authorized a client
 * application, which is issued an access token to make requests on behalf of
 * the authorizing user.
 */
passport.use(new BearerStrategy(
  function (accessToken, done) {
    "use strict";

    // Best practice is to use a random salt in each hash. Since we need to query the
    // database for a valid accessToken, we would have to loop through all the hashes
    // and hash the accessToken the client sent using each salt and check for a match.
    // That could take a lot of CPU if there are 1000's of accessToken. Instead, we will
    // not use any salt for this hash. An accessToken is only valid for 1 hour so the
    // risk of cracking the SHA1 hash in that time is small.
    var accesshash = X.crypto.createHash('sha1').update(privateSalt + accessToken).digest("hex");

    db.accessTokens.findByAccessToken(accesshash, function (err, token) {
      if (err) { return done(err); }
      if (!token) { return done(null, false); }

      // The accessToken is only valid for 1 hour. Has it expired yet?
      if ((new Date(token.get("accessExpires")) - new Date()) < 0) {
        return done(new Error("Access token has expired."));
      }

      var tokenUser = token.get("user"),
          tokenScope = JSON.parse(token.get("scope")),
          scopeErr = false,
          scopeOrg = null;

      // If this is a JWT access token, "user" is empty. Try to load the "delegate"
      if (!tokenUser) {
        tokenUser = token.get("delegate");
      }

      // If there are multiple scopes, they should only relate to one org.
      // e.g. [dev.contact, dev.customer, dev.salesorder.readonly] can all be
      // distilled to the "dev" org. Extract a single org from the scopes.
      _.each(tokenScope, function (value, key, list) {
        var scopeParts = value.split(".");

        // TODO - A client should be able to get a token for a userinfo REST call but
        // not have a selected org. This would allow a client not to specify an
        // org scope and then receive an error that includes the URI to call to
        // get a user's scope/org list: 'https://mobile.xtuple.com/auth/userinfo.xxx'
        if (!scopeOrg && (scopeParts[0] !== 'userinfo')) {
          // Get the first part of the scope, which should be the "org".
          // e.g. "toytruck" from "toytruck.contact.readonly"
          scopeOrg = scopeParts[0];
        } else if ((scopeParts[0] !== 'userinfo') && (scopeOrg !== scopeParts[0])) {
          // After the first loop, make sure all the other scopes have the same org.
          // One of the scopes does not match.
          scopeErr = new Error("Invalide Request");
        }
      });

      if (scopeErr) {
        return done(scopeErr);
      }

      if (tokenUser) {
        db.users.findByUserOrg(tokenUser, scopeOrg, function (err, userOrg) {
          if (err) { return done(err); }
          if (!userOrg) { return done(null, false); }

          var info = {},
              scopes = token.get("scope");

          try {
            scopes = JSON.parse(scopes);
          } catch (error) {
            if (!Array.isArray(scopes)) { scopes = [ scopes ]; }
          }

          info = { scope: scopes };
          done(null, userOrg, info);
        });
      } else {
        return done(null, false);
      }
    });
  }
));
