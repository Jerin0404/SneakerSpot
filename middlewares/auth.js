const User = require("../models/userSchema");

const userAuth = (req, res, next) => {
    console.log("session data in userAuth", req.session);   
    if (req.session.user) {
        const userId = req.session.user.id || req.session.user; 
        
        if (!userId || userId.length !== 24) {
            return res.redirect("/login");
        }

        User.findById(userId)
            .then(data => {
                if (data && !data.isBlocked) {
                    next();
                } else {
                    res.redirect("/login");
                }
            })
            .catch(error => {
                console.error("Error in user auth middleware:", error);
                res.status(500).send("Internal Server Error");
            });
    } else {
        res.redirect("/login");
    }
};

const adminAuth = (req, res, next) => {
    User.findOne({isAdmin:true})
    .then(data=> {
        if(data) {
            next();
        }else {
            res.redirect("/admin/login")
        }
    })
    .catch(error => {
        console.log("Error in adminauth middleware", error);
        res.status(500).send("Internal Server Error");
    })
}

const checkBlockedUser = async (req, res, next) => {
    if (req.session.user) {
        const user = await User.findById(req.session.user.id);
        if (user && user.isBlocked) {
            req.session.destroy();
            return res.redirect("/login");
        }
    }
    next();
};




module.exports = {
    userAuth,
    adminAuth,
    checkBlockedUser,
}