const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    orderId: { type: String, required: true, unique: true },
    orderItems: { type: Array, required: true },
    totalPrice: { type: Number, required: true },
    finalAmount: { type: Number, required: true },
    address: {
        name: { type: String, required: true }, // ✅ Changed from fullName to name
        phone: { type: Number, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: Number, required: true }, // ✅ Changed from zipCode to pincode
        landMark: { type: String, default: "" },
    },
    paymentMethod: { 
        type: String, 
        enum: ["COD", "Online"], // ✅ Ensure "COD" is capitalized
        required: true 
    },
    status: { type: String, default: "Pending" },
}, { timestamps: true });

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
