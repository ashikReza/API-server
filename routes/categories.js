const express = require("express");
const router = express();

const Category = require("../models/category");

router.get("/", async (req, res) => {
  const categoryList = await Category.find();

  if (!categoryList) {
    res.status(500).json({ success: false });
  }
  res.status(200).send(categoryList);
});

router.get("/:id", async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    res.status(500).json({
      success: false,
      message: "The category with the given ID not exists",
    });
  }
  res.status(200).send(category);
});

router.post("/", async (req, res) => {
  try {
    // Check if a category with the given name already exists
    const existingCategory = await Category.findOne({ name: req.body.name });

    // If a category with the name already exists, send an error response
    if (existingCategory) {
      return res.status(400).send("Category name already in use");
    }

    // If no category with the name exists, proceed with creating a new category
    const category = new Category({
      name: req.body.name,
      icon: req.body.icon,
      color: req.body.color,
    });

    // Save the new category to the database
    const savedCategory = await category.save();

    if (!savedCategory) {
      return res.status(500).send("Failed to create category");
    }

    // Send the newly created category as a response
    res.status(201).send(savedCategory);
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).send("Internal server error");
  }
});

router.put("/:id", async (req, res) => {
  // Check if another category with the same name exists and has a different ID
  const existingCategory = await Category.findOne({
    name: req.body.name,
    _id: { $ne: req.params.id },
  });

  // If another category with the name exists, send an error response
  if (existingCategory) {
    return res.status(400).send("Category name already in use");
  }

  // If no other category with the name exists, proceed with updating the category
  const category = await Category.findByIdAndUpdate(
    req.params.id,
    {
      name: req.body.name,
      icon: req.body.icon,
      color: req.body.color,
    },
    { new: true }
  );

  if (!category) return res.status(404).send("Category cannot be updated");
  res.send(category);
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
