const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "https://fhcollectionsbd.netlify.app"],
    credentials: true,
  })
);
app.use(express.json());

// MongoDB connection
const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cauvj2c.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const productsCollection = client.db("FHdb").collection("products");

    // Getting data from MongoDB
    app.get("/products", async (req, res) => {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 9;
      const sortField = req.query.sortField || "creationDate";
      const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
      const search = req.query.search || "";
      const category = req.query.category || "";
      const brand = req.query.brand || "";
      const priceRange = req.query.priceRange || "";

      const query = {
        $and: [
          {
            $or: [
              { productName: { $regex: search, $options: "i" } },
              { brand: { $regex: search, $options: "i" } },
            ],
          },
          category ? { category: category } : {},
          brand ? { brand: brand } : {},
        ],
      };

      // Handle price filtering
      if (priceRange) {
        const [minPrice, maxPrice] = priceRange.split("-").map(Number);
        if (!isNaN(minPrice) && !isNaN(maxPrice)) {
          query.$and.push({
            price: {
              $gte: minPrice,
              $lte: maxPrice,
            },
          });
        }
      }

      try {
        const totalProducts = await productsCollection.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);

        const products = await productsCollection
          .find(query)
          .sort({ [sortField]: sortOrder })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray();

        res.send({
          products,
          currentPage: page,
          totalPages,
        });
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("style room server is running");
});

app.listen(port, () => {
  console.log("style room server on port: ", port);
});
