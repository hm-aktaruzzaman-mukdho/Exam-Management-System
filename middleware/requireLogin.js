const requireLogin = (req, res, next) => {
    // if (!req.session.userId || !req.session.userType) {
    //     res.redirect('/login'); // Redirect to login page if user is not logged in
    // }
    if(!req.session.userType)
    {
      res.redirect('/'); // Redirect to login page
    }
    else if(!req.session.userId)
    {
      if(req.session.user==='student')
      {
        res.redirect('/student/login');
      }
      else
      {
        res.redirect('/teacher/login');
      }
    }
    else {
        next(); // Continue to next middleware/route handler
    }
  };

  module.exports =requireLogin;