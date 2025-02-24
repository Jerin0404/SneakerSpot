const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const mongodb = require("mongodb");


const getCartPage = async (req, res) => {
    try {
        const id = req.session.user.id;
        const user = await User.findOne({_id: id});
        const productIds = user.cart.map((item) => item.productId);
        const products = await Product.find({_id: {$in: productIds}});
        const oid = new mongodb.ObjectId(id);

        let data = await User.aggregate([
            {$match: {_id: oid}},
            {$unwind: "$cart"},
            {
                $project: {
                    prold: {$toObjectId: "$cart.productId"},
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
        let quantity = 0;
        for(const i of user.cart) {
            quantity += i.quantity
        }
        let grandTotal = 0;
        for(let i = 0; i < data.length; i++) {
            if(products[i]) {
                grandTotal += data[i].productDetails[0].salePrice * data[i].quantity;
            }
            req.session.grandTotal = grandTotal;

        }

        res.render("cart", {
            user,
            quantity,
            data,
            grandTotal,
        });
    } catch (error) {
        res.redirect("/pageNotFound");
    }
};


module.exports = {
    getCartPage,
}