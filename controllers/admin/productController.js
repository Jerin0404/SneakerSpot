const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");



const getProductAddPage = async (req, res) => {
    try {
        const category = await Category.find({isListed:true});
        const brand = await Brand.find({isBlocked:false});
        res.render("product-add", {
            cat:category,
            brand:brand
        });
    } catch (error) {
        res.redirect("/admin/pageerror")
    }
}

const addProducts = async (req, res) => {
    try {
        const products = Array.isArray(req.body) ? req.body : [req.body]; // Ensure products is an array

        // Check and create the upload directory if it doesn't exist
        const imageUploadDir = path.join('public', 'uploads', 'product-images');
        if (!fs.existsSync(imageUploadDir)) {
            fs.mkdirSync(imageUploadDir, { recursive: true });
        }

        const productsToInsert = [];

        for (const productData of products) {
            const productExists = await Product.findOne({ productName: productData.productName });

            if (!productExists) {
                let images = [];
                console.log('❤️req.file:',req.files);
                
                if (req.files && req.files.length > 0) {
                    images = await Promise.all(
                        req.files.map(async (file) => {
                            const resizedImagePath = path.join(imageUploadDir, file.filename);
                            await sharp(file.path).resize({ width: 440, height: 440 }).toFile(resizedImagePath);
                            return file.filename;
                        })
                    );
                }
                //check product size is Pending::{ }

                const category = await Category.findOne({ name: productData.category });
                if (!category) {
                    return res.status(400).send(`Invalid category name: ${productData.category}`);
                }
                console.log("❤️porductData::",productData);
                
                productsToInsert.push({
                    productName: productData.productName,
                    description: productData.description,
                    brand: productData.brand,
                    category: category._id,
                    regularPrice: productData.regularPrice,
                    salePrice: productData.salePrice,
                    createdOn: new Date(),
                    quantity: productData.quantity,
                    size: productData.size,
                    color: productData.color,
                    productImage: images,
                    status: 'Available',
                });
            }
        }

        if (productsToInsert.length > 0) {
            await Product.insertMany(productsToInsert);
            return res.redirect("/admin/addProducts",{});
        } else {
            return (
                res.status(400).json("No new products added. Some products may already exist.")
            )
        }
    } catch (error) {
        console.error("Error saving products", error);
        return res.redirect("/admin/pageerror");
    }
};

const getAllProducts = async (req, res) => {
    try {
        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 8; // Increased limit to show more products per page

        const productData = await Product.find({
            $or: [
                { productName: { $regex: new RegExp(search, "i") } },
            ],
        })
        .limit(limit)
        .skip((page - 1) * limit)
        .populate("category")  // Populate category details
        .populate("brand")     // Populate brand details
        .exec();

        const count = await Product.countDocuments({
            $or: [
                { productName: { $regex: new RegExp(search, "i") } },
            ],
        });

        const category = await Category.find({ isListed: true });
        const brand = await Brand.find({ isBlocked: false });

        if (!category.length || !brand.length) {
            return res.render("page-404");
        }

        res.render("products", {
            data: productData,
            currentPage: page,
            totalPages: Math.ceil(count / limit),
            cat: category,
            brand: brand,
        });

    } catch (error) {
        console.error("Error fetching products:", error);
        return res.redirect("/admin/pageerror");
    }
};


const addProductOffer = async (req, res) => {
    try {
        const {productId,percentage} = req.body;
        const findProduct = await Product.findOne({_id:productId});
        const findCategory = await Category.findOne({_id:findProduct.category});
        if(findCategory.categoryOffer > percentage) {
            return res.json({status:false, message:"This product category already has a category offer"})
        }

        findProduct.salePrice = findProduct.salePrice-Math.floor(findProduct.regularPrice*(percentage/100));
        findProduct.productOffer = parseInt(percentage);
        await findProduct.save();
        findCategory.categoryOffer = 0;
        await findCategory.save();
        res.json({status:true});


    } catch (error) {
        res.redirect("/admin/pageerror");
        res.status(500).json({status:false,message:"Internal Server Error"})
    }
};


const removeProductOffer = async (req, res) => {
    try {
        const {productId} = req.body
        const findProduct = await Product.findOne({_id:productId});
        const percentage = findProduct.productOffer;
        findProduct.salePrice = findProduct.salePrice+Math.floor(findProduct.regularPrice*(percentage/100));
        findProduct.productOffer = 0;
        await findProduct.save();
        res.json({status:true})
    } catch (error) {
        res.redirect("/admin/pageerror")
    }
}

const blockProduct = async (req, res) => {
    try {
        let id = req.query.id;
        await Product.updateOne({_id:id}, {$set:{isBlocked:true}});
        res.redirect("/admin/products");
    } catch (error) {
        res.redirect("/admin/pageerror")
    }
}

const unblockProduct = async (req, res) => {
    try {
        let id = req.query.id;
        await Product.updateOne({_id:id}, {$set:{isBlocked:false}});
        res.redirect("/admin/products");
    } catch (error) {
        res.redirect("/admin/pageerror")
    }
}

const getEditProduct = async (req, res) => {
    try {
        const id = req.query.id;
        const product = await Product.findOne({_id:id});
        console.log(product)
        const category = await Category.find({});
        const brand = await Brand.find({});
        res.render("edit-product", {
            product:product,
            cat:category,
            brand:brand,

        })
    } catch (error) {
        res.redirect("/admin/pageerror")
    }
}

const editProduct = async (req, res) => {
    try {
        const id = req.params.id;
        const product = await Product.findOne({_id:id});
        const data = req.body;
        const existingProduct = await Product.findOne({
            productName:data.productName,
            _id:{$ne:id}
        })

        if(existingProduct) {
            return res.status(400).json({error:"Product with this name already exists. Please try with another name"});
        }

        const images = [];
        if(req.files && req.files.length > 0) {
            for(let i = 0; i < req.files.length; i++) {
                images.push(req.files[i].filename);
            }
        }

        const updateFields = {
            productName:data.productName,
            description:data.description,
            brand:data.brand,
            category:product.category,
            regularPrice:data.regularPrice,
            salePrice:data.salePrice,
            quantity:data.quantity,
            size:data.size,
            color:data.color
        }
        if(req.files.length > 0) {
            updateFields.$push = {productImage:{$each:images}};
        }
        console.log("update",updateFields);

        await Product.findByIdAndUpdate(id,updateFields, {new: true});
        res.redirect("/admin/products");
    } catch (error) {
        console.error(error);
        res.redirect("/admin/pageerror");
    }
}

const deleteSingleImage = async (req, res) => {
    try {
        const { imageNameToServer, productIdToServer } = req.body;

        // Validate input
        if (!imageNameToServer || !productIdToServer) {
            return res.status(400).send({ status: false, message: "Missing parameters" });
        }

        // Remove image from product document
        const product = await Product.findByIdAndUpdate(
            productIdToServer, 
            { $pull: { productImage: imageNameToServer } },
            { new: true }
        );

        if (!product) {
            return res.status(404).send({ status: false, message: "Product not found" });
        }

        // Delete file from filesystem
        const imagePath = path.join(__dirname, "../public/uploads/re-image", imageNameToServer);
        
        if (fs.existsSync(imagePath)) {
            fs.unlink(imagePath, (err) => {
                if (err) {
                    console.error("Error deleting file:", err);
                    return res.status(500).send({ status: false, message: "Error deleting image file" });
                }
                console.log(`Image ${imageNameToServer} deleted successfully`);
            });
        } else {
            console.log(`Image ${imageNameToServer} not found`);
        }

        res.send({ status: true, message: "Image deleted successfully" });

    } catch (error) {
        console.error("Error:", error);
        res.redirect("/admin/pageerror");
    }
};

module.exports = {
    getProductAddPage,
    addProducts,
    getAllProducts,
    addProductOffer,
    removeProductOffer,
    blockProduct,
    unblockProduct,
    getEditProduct,
    editProduct,
    deleteSingleImage,
}