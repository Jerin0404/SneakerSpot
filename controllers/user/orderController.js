const mongoose = require('mongoose');
const { ObjectId } = require('mongodb')
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Coupon = require("../../models/couponSchema");
const Order = require("../../models/orderSchema");

const getCheckoutPage = async (req, res) => {
    try {
        // Debugging session
        console.log("Session Data:", req.session);
        console.log("Session User ID:", req.session?.user?.id); // Use _id instead of id

        // Ensure session exists
        if (!req.session?.user?.id) { // Use _id for MongoDB ObjectId
            console.error("User is not logged in.");
            return res.redirect("/login"); // Redirect to login if no session
        }

        const userId = req.session.user.id; // Fix: Use _id
        console.log("User ID:", userId);

        // Validate userId format
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            console.error("Invalid User ID format:", userId);
            return res.redirect("/pageNotFound");
        }

        // Find user in the database
        const findUser = await User.findById(userId);

        if (!findUser) {
            console.error("User not found for ID:", userId);
            return res.redirect("/login");
        }

        console.log("User Found:", findUser.name);

        // Find address and cart
        const addressData = await Address.findOne({ userId });
        const cartData = await Cart.findOne({ userId })
            .populate({ path: "items.productId", model: "Product" });

        if (!cartData || !cartData.items || cartData.items.length === 0) {
            console.error("Cart is empty for user ID:", userId);
            return res.redirect("/shop");
        }

        let grandTotal = cartData.items.reduce((total, item) => {
            return item.productId?.salePrice && item.quantity
                ? total + item.quantity * item.productId.salePrice
                : total;
        }, 0);

        if (!grandTotal || grandTotal <= 0) {
            console.error("Invalid Grand Total, redirecting to shop");
            return res.redirect("/shop");
        }

        // Get active coupons
        const today = new Date();
        const findCoupons = await Coupon.find({
            isList: true,
            createdOn: { $lt: today },
            expireOn: { $gt: today },
            minimumPrice: { $lt: grandTotal },
        });

        // ✅ Pass userId explicitly to EJS
        res.render("checkoutCart", {
            userId, // Pass userId here
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
        const { userId, selectedAddress, paymentMethod, totalAmount } = req.body;

        console.log("Order Request Received:", req.body);

        // Fetch user's saved addresses
        const addressDoc = await Address.findOne({ userId });

        if (!addressDoc || !addressDoc.address || addressDoc.address.length === 0) {
            console.log("❌ No addresses found for user!");
            return res.status(400).json({ success: false, message: "No address found for this user" });
        }

        const cleanSelectedAddress = String(selectedAddress).trim();
        const address = addressDoc.address.find(addr => addr._id.toString() === cleanSelectedAddress);

        if (!address) {
            console.log("❌ Invalid Address Selection:", cleanSelectedAddress);
            return res.status(400).json({ success: false, message: "Invalid address selection" });
        }

        if (!address.pincode || !address.name) {
            console.log("❌ Missing address fields:", address);
            return res.status(400).json({ success: false, message: "Address is missing required fields" });
        }

        console.log("✅ Address Found:", address);

        const formattedAddress = {
            name: address.name,
            phone: address.phone,
            city: address.city,
            state: address.state || "N/A",
            pincode: address.pincode,
            landMark: address.landMark || "N/A",
        };

        const validPaymentMethods = ["COD", "RAZORPAY", "WALLET"];
        const formattedPaymentMethod = paymentMethod.toUpperCase();

        if (!validPaymentMethods.includes(formattedPaymentMethod)) {
            console.log("❌ Invalid Payment Method:", paymentMethod);
            return res.status(400).json({ success: false, message: "Invalid payment method" });
        }

        // Create order
        const newOrder = new Order({
            userId,
            orderId: `SNK-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            orderItems: [], // Populate this with cart items
            totalPrice: totalAmount,
            finalAmount: totalAmount,
            address: formattedAddress,
            paymentMethod: formattedPaymentMethod,
            status: "Pending",
        });

        await newOrder.save();
        console.log("✅ Order placed successfully!", newOrder);

        return res.json({ success: true, orderId: newOrder._id });

    } catch (error) {
        console.error("🔥 Error placing order:", error);
        return res.status(500).json({ success: false, message: "Something went wrong" });
    }
};



const getOrderSuccessPage = async (req, res) => {
    try {
        const { orderId } = req.query;

        if (!orderId) {
            return res.render("orderSuccess", { order: null, message: "Invalid order." });
        }

        const order = await Order.findById(orderId);  // 🔥 FIXED: Using MongoDB Object ID

        if (!order) {
            return res.render("orderSuccess", { order: null, message: "Order not found." });
        }

        res.render("orderSuccess", { order, message: null });

    } catch (error) {
        console.error("Error fetching order success page:", error);
        res.render("orderSuccess", { order: null, message: "Something went wrong." });
    }
};




const getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        console.log("Received orderId:", orderId); // Debugging log

        if (!orderId) {
            return res.status(400).send("Order ID is required");
        }

        const order = await Order.findOne({ _id: orderId }).populate("product.productId");

        if (!order) {
            return res.status(404).send("Order not found");
        }

        let totalPrice = 0;
        let discount = order.discount || 0;
        let totalGrant = order.grandTotal || 0;

        order.product.forEach((item) => {
            totalPrice += item.price * item.quantity;
        });

        const finalAmount = totalPrice - discount;

        res.render("user/orderDetails", {
            orders: order,
            totalPrice,
            discount,
            totalGrant,
            finalAmount
        });

    } catch (error) {
        console.error("Error fetching order details:", error);
        res.status(500).send("Internal Server Error");
    }
};

module.exports = {
    getCheckoutPage,
    deleteProduct,
    order,
    getOrderSuccessPage,
    getOrderDetails,
};