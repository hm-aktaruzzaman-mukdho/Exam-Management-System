/**
 * Authentication and authorization middleware.
 */

const requireLogin = (req, res, next) => {
    if (!req.session || !req.session.userId || !req.session.userType) {
        // If requesting a student route, redirect to student login
        if (req.baseUrl.startsWith('/student') || req.path.startsWith('/student')) {
            return res.redirect('/student/login');
        }
        // If requesting a teacher route, redirect to teacher login
        if (req.baseUrl.startsWith('/teacher') || req.path.startsWith('/teacher')) {
            return res.redirect('/teacher/login');
        }
        return res.redirect('/');
    }
    return next();
};

const requireStudent = (req, res, next) => {
    if (!req.session || !req.session.userId || req.session.userType !== 'student') {
        return res.redirect('/student/login');
    }
    return next();
};

const requireTeacher = (req, res, next) => {
    if (!req.session || !req.session.userId || req.session.userType !== 'teacher') {
        return res.redirect('/teacher/login');
    }
    return next();
};

const requireAdmin = (req, res, next) => {
    if (!req.session || !req.session.userId || req.session.userType !== 'teacher' || !req.session.isAdmin) {
        if (req.accepts('html')) {
            return res.status(403).send(`
                <div style="font-family: sans-serif; text-align: center; padding: 50px;">
                    <h2 style="color: #DC2626;">403 - Forbidden</h2>
                    <p>Access restricted to authorized administrators only.</p>
                    <a href="/teacher/login" style="color: #2563EB;">Return to Login</a>
                </div>
            `);
        }
        return res.status(403).json({ error: "Forbidden: Admin privileges required" });
    }
    return next();
};

module.exports = requireLogin;
module.exports.requireLogin = requireLogin;
module.exports.requireStudent = requireStudent;
module.exports.requireTeacher = requireTeacher;
module.exports.requireAdmin = requireAdmin;