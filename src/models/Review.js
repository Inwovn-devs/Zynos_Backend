const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    body: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    images: [
      {
        type: String,
      },
    ],
    isVerified: {
      type: Boolean,
      default: false, // Verified purchase
    },
    helpful: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// One review per user per product
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// Update product ratings after review save
reviewSchema.post('save', async function () {
  const Product = require('./Product');
  const stats = await mongoose.model('Review').aggregate([
    { $match: { product: this.product } },
    {
      $group: {
        _id: '$product',
        average: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(this.product, {
      'ratings.average': Math.round(stats[0].average * 10) / 10,
      'ratings.count': stats[0].count,
    });
  }
});

// Update product ratings after review delete
reviewSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    const Product = require('./Product');
    const stats = await mongoose.model('Review').aggregate([
      { $match: { product: doc.product } },
      {
        $group: {
          _id: '$product',
          average: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]);

    if (stats.length > 0) {
      await Product.findByIdAndUpdate(doc.product, {
        'ratings.average': Math.round(stats[0].average * 10) / 10,
        'ratings.count': stats[0].count,
      });
    } else {
      await Product.findByIdAndUpdate(doc.product, {
        'ratings.average': 0,
        'ratings.count': 0,
      });
    }
  }
});

module.exports = mongoose.model('Review', reviewSchema);
