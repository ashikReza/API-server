const express = require("express");
const router = express();
const multer = require("multer");

const Category = require("../models/category");

router.get("/", async (req, res) => {
  try {
    const categoryList = await Category.find();

    if (!categoryList) {
      return res.status(500).json({ success: false });
    }

    // Modify the image URLs to include the base path
    const categoriesWithBasePath = categoryList.map((category) => {
      return {
        ...category._doc,
        image: category.image
          ? `${req.protocol}://${req.get("host")}/public/uploads/${
              category.image
            }`
          : null,
      };
    });

    res.status(200).json(categoriesWithBasePath);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "The category with the given ID does not exist",
      });
    }

    // Modify the image URL to include the base path
    const categoryWithBasePath = {
      ...category._doc,
      image: category.image
        ? `${req.protocol}://${req.get("host")}/public/uploads/${
            category.image
          }`
        : null,
    };

    res.status(200).json(categoryWithBasePath);
  } catch (error) {
    console.error("Error fetching category:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/uploads/"); // Set the destination folder
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Set the file name
  },
});
const upload = multer({ storage: storage });

router.post("/", upload.single("image"), async (req, res) => {
  try {
    const existingCategory = await Category.findOne({ name: req.body.name });

    if (existingCategory) {
      return res.status(400).send("Category name already in use");
    }

    const category = new Category({
      name: req.body.name,
      icon: req.body.icon,
      color: req.body.color,
      image: req.file ? req.file.filename : null, // Use uploaded image filename if available
    });

    const savedCategory = await category.save();

    if (!savedCategory) {
      return res.status(500).send("Failed to create category");
    }

    // Construct the image URL
    savedCategory.image = `${req.protocol}://${req.get(
      "host"
    )}/public/uploads/${savedCategory.image}`;

    res.status(201).send(savedCategory);
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).send("Internal server error");
  }
});

router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const existingCategory = await Category.findOne({
      name: req.body.name,
      _id: { $ne: req.params.id },
    });

    if (existingCategory) {
      return res.status(400).send("Category name already in use");
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name,
        icon: req.body.icon,
        color: req.body.color,
        image: req.file ? req.file.filename : req.body.image, // Update image if uploaded, else use existing image
      },
      { new: true }
    );

    if (!category) return res.status(404).send("Category cannot be updated");

    // Construct the image URL
    category.image = `${req.protocol}://${req.get("host")}/public/uploads/${
      category.image
    }`;

    res.send(category);
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).send("Internal server error");
  }
});

router.delete("/:id", (req, res) => {
  Category.findByIdAndRemove(req.params.id)
    .then((category) => {
      if (category) {
        return res
          .status(200)
          .json({ success: true, message: "Category deleted successfully" });
      } else {
        return res
          .status(404)
          .json({ success: false, message: "Category cannot find" });
      }
    })
    .catch((err) => {
      return res.status(400).json({ success: false, error: err });
    });
});

module.exports = router;
