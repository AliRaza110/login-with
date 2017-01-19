const jwt = require('jsonwebtoken')

module.exports.onAuthenticationRequest = ({strategies, passport}) => (req, res, next) => {
  const type = req.path.split('/')[1]
  const strategy = strategies.find(strategy => strategy.type === type)
  const opts = {}
  req.session.successRedirect = req.query.successRedirect
  req.session.failureRedirect = req.query.failureRedirect
  if (strategy.preHook) {
    strategy.preHook(req, opts)
  }
  passport.authenticate(type, opts)(req, res, next)
}

const cookieOpts = ({httpOnly, reset = false, domain, maxAge = false}) => ({
  secure: true,
  httpOnly,
  domain,
  expires: reset ? new Date() : null,
  maxAge: !reset ? maxAge : maxAge
})

module.exports.onAuthenticationCallback = ({strategies, passport, tokenCookieName, tokenSecret, profileCookieName, cookieDomain, maxAge = false}) => (req, res, next) => {
  const type = req.path.split('/')[1]
  passport.authenticate(type, (error, user) => {
    if (error) {
      res.cookie(tokenCookieName, '', cookieOpts({
        reset: true,
        httpOnly: true,
        domain: cookieDomain
      }))
      res.cookie(profileCookieName, JSON.stringify({error}), cookieOpts({
        httpOnly: false,
        domain: cookieDomain,
        maxAge
      }))
      if (req.session.failureRedirect) {
        return res.redirect(decodeURIComponent(req.session.failureRedirect))
      }
    } else if (user) {
      res.cookie(tokenCookieName, jwt.sign(user, tokenSecret), cookieOpts({
        httpOnly: true,
        domain: cookieDomain,
        maxAge
      }))
      res.cookie(profileCookieName, JSON.stringify(user.profile), cookieOpts({
        httpOnly: false,
        domain: cookieDomain,
        maxAge
      }))
      if (req.session.successRedirect) {
        return res.redirect(decodeURIComponent(req.session.successRedirect))
      }
    }
    return res.json({error, user})
  })(req, res)
}

module.exports.onLogout = ({tokenCookieName, profileCookieName, cookieDomain}) => (req, res) => {
  res.cookie(tokenCookieName, '', cookieOpts({
    reset: true,
    httpOnly: true,
    domain: cookieDomain
  }))
  res.cookie(profileCookieName, '', cookieOpts({
    reset: true,
    httpOnly: false,
    domain: cookieDomain
  }))
  if (req.query.successRedirect) {
    return res.redirect(decodeURIComponent(req.query.successRedirect))
  }
  return res.json({status: 'logged out'})
}

module.exports.onIndex = ({tokenCookieName, profileCookieName}) => (req, res) => {
  return res.json({token: req.cookies[tokenCookieName], profile: req.cookies[profileCookieName]})
}
