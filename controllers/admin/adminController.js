const User = require("../../models/userSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const pageerror = async (req, res) => {
    res.render("admin-error");
}

const loadLogin = (req, res) => {
    if (req.session.admin) {
        return res.redirect("/admin/dashboard");
    }
    res.render("admin-login", { message: null });
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await User.findOne({ email, isAdmin: true });

        if (admin) {
            const passwordMatch = await bcrypt.compare(password, admin.password); // Await here

            if (passwordMatch) {
                req.session.admin = true;
                req.session.user = null; // Ensure regular user session is cleared if exists
                return res.redirect("/admin"); // Ensure the correct path
            } else {
                return res.redirect("/login", { message: "Incorrect password" });
            }
        } else {
            return res.redirect("/login", { message: "Admin not found" });
        }
    } catch (error) {
        console.error("Login error:", error);
        return res.redirect("/admin/pageerror");
    }
};

const loadDashboard = async (req, res) => {
    if (!req.session.admin) {
        return res.redirect("/admin/login");
    }
    try {
        res.render("dashboard");
    } catch (error) {
        res.redirect("/admin/pageerror");
    }
};

const logout = async (req, res) => {
    try {
        req.session.destroy(err => {
            if(err) {
                console.log("Error destroying session", err);
                return res.redirect("/pageerror");
            }
            res.redirect("/admin/login")
        })
    } catch (error) {
        console.log("unexpected error during logout", error);
        res.redirect("/admin/pageerror");
    }
}
module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageerror,
    logout,
};
