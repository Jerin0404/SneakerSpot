const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const mongoose = require("mongoose");



const getCartPage = async (req, res) => {
    try {
        const id = req.session.user.id;
        const user = await User.findOne({_id: id});
        if (!user) return res.redirect("/login");

        const productIds = user.cart?.map((item) => item.productId) || [];
        const products = await Product.find({_id: {$in: productIds}});
        const oid = new mongoose.Types.ObjectId(id);

        let data = await User.aggregate([
            {$match: {_id: oid}},
            {$unwind: "$cart"},
            {
                $project: {
                    prold: "$cart.productId",
                    quantity: "$cart.quantity",
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "prold",
                    foreignField: "_id",
                    as: "productDetails",
                },
            },
        ]);

        let quantity = user.cart.reduce((sum, item) => sum + item.quantity, 0);

        let grandTotal = 0;
        for (let i = 0; i < data.length; i++) {
            if (data[i].productDetails.length > 0) { // Prevent errors if product doesn't exist
                grandTotal += data[i].productDetails[0].salePrice * data[i].quantity;
            }
        }
        req.session.grandTotal = grandTotal;

        res.render("cart", {
            user,
            quantity,
            data,
            grandTotal,
        });
    } catch (error) {
        console.error("Error fetching cart:", error);
        res.redirect("/pageNotFound");
    }
};


module.exports = {
    getCartPage,

}