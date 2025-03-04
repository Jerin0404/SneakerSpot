const User = require("../../models/userSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const pageerror = async (req, res) => {
    res.render("admin-error");
};

const loadLogin = (req, res) => {
    if (req.session.admin) {
        return res.redirect(302, "/admin/dashboard");
    }
    const message = req.session.message;
    req.session.message = null;
    res.render("admin-login", { message });
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await User.findOne({ email, isAdmin: true });

        if (admin) {
            const passwordMatch = await bcrypt.compare(password, admin.password);

            if (passwordMatch) {
                req.session.admin = { _id: admin._id, isAdmin: true };

                return res.redirect(302, "/admin/dashboard");
            } else {
                req.session.message = "Incorrect password";
                return res.redirect(302, "/admin/login");
            }
        } else {
            req.session.message = "Admin not found";
            return res.redirect(302, "/admin/login");
        }
    } catch (error) {
        console.error("Login error:", error);
        return res.redirect(302, "/admin/pageerror");
    }
};



const loadDashboard = async (req, res) => {
    if (!req.session.admin) {
        return res.redirect(302, "/admin/login");
    }
    try {
        res.render("dashboard");
    } catch (error) {
        console.error("Dashboard Load Error:", error);
        res.redirect(302, "/admin/pageerror");
    }
};




const logout = async (req, res) => {
    try {
        req.session.destroy(err => {
            if (err) {
                console.log("Error destroying session", err);
                return res.redirect(302, "/admin/pageerror");
            }
            res.redirect(302, "/admin/login");
        });
    } catch (error) {
        console.log("Unexpected error during logout", error);
        res.redirect(302, "/admin/pageerror");
    }
};


module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageerror,
    logout,
};
