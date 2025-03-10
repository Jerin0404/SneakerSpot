const mongoose = require("mongoose");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Coupon = require("../../models/couponSchema");
const Order = require("../../models/orderSchema");

const getCheckoutPage = async (req, res) => {
    try {
        const userId = req.session.user?.id;

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            console.error("Invalid or Missing User ID:", userId);
            return res.redirect("/pageNotFound");
        }

        const userObjectId = new mongoose.Types.ObjectId(userId);

        const findUser = await User.findById(userObjectId);
        if (!findUser) {
            console.error("User not found for ID:", userId);
            return res.redirect("/pageNotFound");
        }

        const addressData = await Address.findOne({ userId: userObjectId });

        const cartData = await Cart.findOne({ userId: userObjectId })
            .populate({
                path: "items.productId",
                model: "Product",
            });

        if (!cartData || !cartData.items || cartData.items.length === 0) {
            console.error("Cart is empty or invalid for user ID:", userId);
            return res.redirect("/shop");
        }


        let grandTotal = cartData.items.reduce((total, item) => {
            if (!item.productId || !item.productId.salePrice || !item.quantity) {
                return total;
            }
            return total + item.quantity * item.productId.salePrice;
        }, 0);

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

const deleteProduct = async (req, res) => {
    try {
        const id = req.params.id;
        const userId = req.session.user._id;

        const updatedCart = await Cart.findOneAndUpdate(
            { userId },
            { $pull: { products: { productId: id } } },
            { new: true }
        );

        if (!updatedCart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        res.json({ success: true, message: "Product removed successfully" });

    } catch (error) {
        console.error("Error deleting product:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
const order = async (req, res) => {
    try {
        const { userId, selectedAddress, paymentMethod, totalAmount, couponApplied } = req.body;
        const cart = await Cart.findOne({ userId }).populate("items.productId");
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: "Your cart is empty" });
        }

        const addressDoc = await Address.findOne({ userId });
        if (!addressDoc || !addressDoc.address || addressDoc.address.length === 0) {
            return res.status(400).json({ success: false, message: "No address found for this user" });
        }

        const address = addressDoc.address.id(selectedAddress);
        if (!address) {
            return res.status(400).json({ success: false, message: "Invalid address selection" });
        }


        const orderItems = cart.items.map(item => ({
            product: item.productId._id,
            quantity: item.quantity,
            size: item.size || "N/A",
            price: item.productId.salePrice,
        }));

        const totalPrice = cart.items.reduce((total, item) => total + (item.productId.salePrice * item.quantity), 0);
        const finalAmount = totalPrice - (couponApplied?.discount || 0);

        const newOrder = new Order({
            orderItems,
            totalPrice,
            finalAmount,
            address: selectedAddress,
            paymentMethod: paymentMethod === "cod" ? "COD" : paymentMethod,
            couponApplied: !!couponApplied,
        });

        await newOrder.save();
        await Cart.findOneAndDelete({ userId });

        return res.status(200).json({
            success: true,
            message: "Order placed successfully",
            orderId: newOrder._id,
            redirectUrl: "/orderSuccess",
        });

    } catch (error) {
        console.error("Error placing order:", error);
        return res.status(500).json({ success: false, message: "Something went wrong" });
    }
};

const getOrderSuccessPage = async (req, res) => {
    try {
        res.render("orderSuccess");
    } catch (error) {
        console.error("Error rendering order success page:", error);
        res.status(500).send("Something went wrong");
    }
};
module.exports = {
    getCheckoutPage,
    deleteProduct,
    order,
    getOrderSuccessPage,
};