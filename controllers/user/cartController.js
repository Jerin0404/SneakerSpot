const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");

const viewCart = async (req, res) => {
    try {
        if (!req.session.user || !req.session.user.id) {
            return res.redirect("/login");
        }

        const userId = req.session.user.id;
        const cart = await Cart.findOne({ userId })
            .populate("items.productId", "name productImage salePrice stock category brand");

        if (!cart || cart.items.length === 0) {
            return res.render("cart", {
                data: [],
                grandTotal: 0,
                user: req.session.user,
                message: "Your cart is empty."
            });
        }

        let grandTotal = 0;

        let formattedCart = cart.items.map(item => {
            const product = item.productId;

            if (!product) {
                console.warn(`Product not found for cart item: ${item._id}`);
                return null;
            }

            const totalPrice = product.salePrice * item.quantity;
            grandTotal += totalPrice;

            return {
                cartId: cart._id,
                productDetails: [product],
                productId: product._id,
                name: product.name || "No Name Available",
                image: product.productImage && product.productImage.length > 0 ? product.productImage[0] : "default.jpg",
                category: product.category || "Unknown Category",
                brand: product.brand || "Unknown Brand",
                size: item.size || "Not Specified", // Include size
                quantity: item.quantity,
                price: product.salePrice,
                totalPrice,
                status: item.status,
                isOutOfStock: product.stock < item.quantity
            };
        }).filter(item => item !== null);

        res.render("cart", {
            data: formattedCart,
            grandTotal,
            user: req.session.user,
            message: ""
        });

    } catch (error) {
        console.error("Error fetching cart:", error);
        res.status(500).render("cart", {
            data: [],
            grandTotal: 0,
            user: req.session.user,
            message: "Internal server error."
        });
    }
};





const addToCart = async (req, res) => {
    try {
        const { productId, quantity = 1, size } = req.body;

        const userId = req.session.user.id;
        if (!userId) {
            return res.status(401).json({ status: false, message: "User not authenticated" });
        }

        if (!productId) {
            return res.status(400).json({ status: false, message: "Product ID is required" });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ status: false, message: "Product not found" });
        }

        let productPrice = product.salePrice;
        if (size) {
            const sizeIncrease = (parseInt(size) - 6) * 200;
            productPrice += sizeIncrease;
        }


        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        const existingItemIndex = cart.items.findIndex(
            (item) => item.productId.toString() === productId && item.size === size
        );

        if (existingItemIndex > -1) {
            const existingItem = cart.items[existingItemIndex];
            existingItem.quantity += quantity;
            existingItem.totalPrice = existingItem.quantity * existingItem.price;
        } else {
            cart.items.push({
                productId,
                quantity,
                size: size || "",
                price: productPrice,
                totalPrice: productPrice * quantity,
            });
        }

        await cart.save();

        return res.status(200).json({ status: true, message: "Added to cart successfully", cart });
    } catch (error) {
        console.error("Error adding to cart:", error);
        return res.status(500).json({ status: false, message: "Internal server error", error: error.message });
    }
};


const changeQuantity = async (req, res) => {
    const { cartId, productId, quantity } = req.body;

    try {
        const product = await Product.findById(productId);

        if (!product) {
            return res.json({ success: false, error: "Product not found!" });
        }

        await Cart.updateOne({ _id: cartId, "items.productId": productId }, {
            $set: { "items.$.quantity": quantity }
        });


        const updatedCart = await Cart.findById(cartId);
        const grandTotal = updatedCart.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

        res.json({ success: true, grandTotal });

    } catch (error) {
        console.error("Error updating quantity:", error);
        res.status(500).json({ success: false, error: "Server error!" });
    }
}

const removeProductFromCart = async (req, res) => {
    const { cartId, productId } = req.body;
    
    try {
        let cart = await Cart.findById(cartId);
        if (!cart) {
            console.log("Cart not found");
            return res.json({ success: false, error: "Cart not found!" });
        }

        // Remove the product
        cart.items = cart.items.filter(item => item.productId.toString() !== productId);

        let grandTotal = cart.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

        await cart.save();

        console.log("Product removed successfully. New total:", grandTotal);

        return res.json({ success: true, grandTotal });

    } catch (error) {
        console.error("Error removing product from cart:", error);
        res.status(500).json({ success: false, error: "Server error!" });
    }
};



module.exports = {
    viewCart,
    addToCart,
    changeQuantity,
    removeProductFromCart,
}