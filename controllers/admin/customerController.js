const User = require("../../models/userSchema");

const customerInfo = async (req, res) => {
    try {
        let search = "";
        if (req.query.search) {
            search = req.query.search;
        }
        let page = 1;
        if (req.query.page) {
            page = req.query.page;
        }
        const limit = 5;

        // Fetch user data from database
        const userData = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } },
            ],
        })
        .limit(limit)
        .skip((page - 1) * limit)
        .exec();

        // Count total matching records
        const count = await User.countDocuments({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } },
            ],
        });

        //Define `data` and pass it to the EJS template
        res.render('customers', { data: userData, totalPages: Math.ceil(count / limit), currentPage: page });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
};
const customerBlocked = async (req, res) => {
    try {
        let id = req.query.id;
        await User.updateOne({_id:id}, {$set: {isBlocked:true}});
        res.redirect("/admin/users")
    } catch (error) {
        res.redirect("/pageerror");
    }
};

const customerunBlocked = async (req, res) => {
    try {
        let id = req.query.id;
        await User.updateOne({_id:id}, {$set: {isBlocked:false}})
        res.redirect("/admin/users");
    } catch (error) {
        res.redirect('/pageerror');
    }
}

module.exports = {
    customerInfo,
    customerBlocked,
    customerunBlocked,
};
