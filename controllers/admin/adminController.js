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
    const message = req.session.message; // Retrieve the message
    req.session.message = null; // Clear it after reading
    res.render("admin-login", { message });
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await User.findOne({ email, isAdmin: true });

        if (admin) {
            const passwordMatch = await bcrypt.compare(password, admin.password);

            if (passwordMatch) {
                req.session.admin = true;
                req.session.user = null; // Ensure regular user session is cleared if exists
                return res.redirect(302, "/admin"); // Corrected syntax
            } else {
                req.session.message = "Incorrect password"; // Store message
                return res.redirect(302, "/admin/login"); // Redirect without passing an object
            }
        } else {
            req.session.message = "Admin not found"; // Store message
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
