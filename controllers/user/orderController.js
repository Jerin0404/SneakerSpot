const mongoose = require("mongoose");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Coupon = require("../../models/couponSchema");

const getCheckoutPage = async (req, res) => {
    try {
        let userId = req.query.userId || req.session.user?.id;

        if (!userId || userId.length !== 24) { 
            console.error("Invalid or Missing User ID:", userId);
            return res.redirect("/pageNotFound");
        }

        const userObjectId = new mongoose.Types.ObjectId(userId);
        const findUser = await User.findOne({ _id: userObjectId });
        if (!findUser) {
            return res.redirect("/pageNotFound");
        }

        const addressData = await Address.findOne({ userId: userObjectId });
        const cartData = await Cart.findOne({ userId: userObjectId }).populate("items.productId");

        if (!cartData || cartData.items.length === 0) {
            return res.redirect("/shop");
        }

        let grandTotal = cartData.items.reduce((total, item) => total + item.quantity * item.productId.salePrice, 0);

        if (!grandTotal || grandTotal <= 0) {
            console.error("Grand Total is empty or invalid, redirecting to shop");
            return res.redirect("/shop");
        }

        const today = new Date();
        const findCoupons = await Coupon.find({
            isList: true,
            createdOn: { $lt: today },
            expireOn: { $gt: today },
            minimumPrice: { $lt: grandTotal },
        });

        res.render("checkoutCart", {
            product: cartData.items,
            user: findUser,
            userId,
            isCart: true,
            userAddress: addressData,
            grandTotal,
            Coupon: findCoupons,
        });

    } catch (error) {
        console.error("Error in getCheckoutPage:", error);
        res.redirect("/pageNotFound");
    }
};


module.exports = { 
    getCheckoutPage,
};
