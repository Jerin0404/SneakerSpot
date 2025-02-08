const User = require("../../models/userSchema");
const bcrypt = require("bcrypt");

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
        return res.redirect("/pageerror");
    }
};

const loadDashboard = async (req, res) => {
    if (req.session.admin) {
        try {
            res.render("dashboard");
        } catch (error) {
            res.redirect("/pageerror");
        }
    }
};

module.exports = {
    loadLogin,
    login,
    loadDashboard,
};
