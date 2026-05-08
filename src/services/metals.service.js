import axios from 'axios';
import Category from '../models/categories.model.js';
import Metal from '../models/metals.model.js';
import ApiError from '../utils/ApiError.js';
import * as transactionService from './transactions.service.js';



const getMetalTransactionTitle = (data) => {
    const parts = [];

    // Action
    parts.push('Bought');

    // Quantity
    if (data.quantity && data.quantity > 1) {
        parts.push(`${data.quantity} x`);
    }

    // Weight
    if (data.form === 'gram' && data.weight) {
        parts.push(`${data.weight}g`);
    }

    if (data.form === 'ounce' && data.weight) {
        parts.push(`${data.weight}g oz`);
    }

    // Lira
    if (data.form === 'lira') {
        const liraMap = {
            quarter: '¼ Lira',
            half: '½ Lira',
            full: '1 Lira'
        };
        parts.push(liraMap[data.liraType] || 'Lira');
    }

    // Metal type
    parts.push(data.type);

    // Purity (only for gold grams)
    if (data.type === 'gold' && data.form === 'gram' && data.purity) {
        parts.push(`(${data.purity})`);
    }

    return parts.join(' ');
};

const convertToUSD = async (amount, currency) => {
    if (!currency || currency === 'USD') {
        return amount;
    }

    try {
        const response = await axios.get(`https://open.er-api.com/v6/latest/USD`);
        const rates = response.data.rates;

        if (!rates[currency]) {
            throw ApiError.badRequest(`Invalid currency: ${currency}`);
        }

        // Convert amount to USD
        const rate = rates[currency];
        const amountInUSD = (amount / rate).toFixed(2);

        if (Number(amountInUSD) <= 0) {
            throw ApiError.badRequest('The amount is too small');
        }

        return Number(amountInUSD);
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        throw ApiError.internal('Failed to fetch exchange rates');
    }
};

export const addMetal = async (userId, metalData) => {
    const currency = metalData.currency;
    let amountInUSD = metalData.price;
    if (currency && currency !== 'USD') {
        amountInUSD = await convertToUSD(metalData.price, currency || 'USD');
    }
    // 1. Get Category
    let category = await Category.findOne({ name: 'Metals',isDefault: true });
    if (!category) {
        category = await Category.findOne({ isDefault: true });
    }

    // 2. Create Transaction
    const transaction = await transactionService.createTransaction(userId, {
        account: metalData.accountId,
        category: category?._id,
        title: metalData.type,
        amount: amountInUSD,
        type: 'expense',
        date: metalData.date || new Date(),
        note: getMetalTransactionTitle(metalData) || 'Automated metal purchase record'
    });

    // 3. Create Metal Record
    const metal = await Metal.create({
        ...metalData,
        userId,
        price: amountInUSD,
        transactionId: transaction._id
    });

    return metal;
};

export const getMetals = async (userId, filters = {}) => {
    const query = { userId };
    
    if (filters.type) query.type = filters.type;
    if (filters.form) query.form = filters.form;
    
    // Sort by newest date first
    const metals = await Metal.find(query).sort({ date: -1 });
    return metals;
};

export const getMetalById = async (userId, metalId) => {
    const metal = await Metal.findOne({ _id: metalId, userId });
    if (!metal) throw ApiError.notFound('Metal record not found');
    return metal;
};

export const updateMetal = async (userId, metalId, updateData) => {
    const metal = await Metal.findOne({ _id: metalId, userId });
    if (!metal) throw ApiError.notFound('Metal record not found');

    if (updateData.price !== undefined) {
      const currency = updateData.currency || 'USD';
        updateData.price = await convertToUSD(updateData.price, currency);
    }

    // Update associated transaction
    if (metal.transactionId) {
        const transactionUpdate = {};
        if (updateData.accountId !== undefined) transactionUpdate.account = updateData.accountId;
        if (updateData.price !== undefined) transactionUpdate.amount = await convertToUSD(updateData.price, updateData.currency || 'USD');
        if (updateData.date !== undefined) transactionUpdate.date = updateData.date;
        if (updateData.type !== undefined) transactionUpdate.title = updateData.type;
        
        // Regenerate title if core fields change
        if (updateData.type || updateData.form || updateData.weight || updateData.quantity) {
            const mergedData = { ...metal.toObject(), ...updateData };
            transactionUpdate.note = getMetalTransactionTitle(mergedData);
        }

        await transactionService.updateTransaction(userId, metal.transactionId, transactionUpdate);
    }

    Object.assign(metal, updateData);
    await metal.save();

    return metal;
};

export const deleteMetal = async (userId, metalId) => {
    const metal = await Metal.findOne({ _id: metalId, userId });
    if (!metal) throw ApiError.notFound('Metal record not found');

    // Delete associated transaction
    if (metal.transactionId) {
        await transactionService.deleteTransaction(userId, metal.transactionId);
    }

    await metal.deleteOne();
    return metal;
};

// satus
// get price of gold and silver in market place
const getMarketPrices = async () => {
  const [goldRes, silverRes] = await Promise.all([
    fetch("https://api.gold-api.com/price/XAU/USD"),
    fetch("https://api.gold-api.com/price/XAG/USD")
  ]);

  const gold = await goldRes.json();
  const silver = await silverRes.json();

  return {
    goldOunce: gold.price,
    silverOunce: silver.price
  };
};
// calculate price for each form based on ounce price
const getGramPrices = (ouncePrice) => {
  const price24k = ouncePrice / 31.1;

  return {
    24: price24k,
    21: price24k * 0.875,
    18: price24k * 0.75
  };
};

export const getMetalStats = async (userId) => {
  const market = await getMarketPrices();

  const goldPrices = getGramPrices(market.goldOunce);
  const silverPricePerGram = market.silverOunce / 31.1;

  const stats = await Metal.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: {
          type: "$type",
          form: "$form",
          purity: "$purity"
        },
        totalWeight: { $sum: "$weight" },
        totalQuantity: { $sum: "$quantity" },
        totalSpent: { $sum: "$price" }
      }
    }
  ]);

  const result = {
    gold: {
      grams: { total: 0, value: 0 },
      liras: { quantity: 0, value: 0 },
      ounces: { quantity: 0, value: 0 },
      byPurity: { "18k": 0, "21k": 0, "24k": 0 },
      totalValue: 0,
      totalSpent: 0,
      marketplace:goldPrices,
    },
    silver: {
      grams: { total: 0, value: 0 },
      ounces: { quantity: 0, value: 0 },
      totalValue: 0,
      totalSpent: 0,
      marketplace:silverPricePerGram,
    }
  };

  stats.forEach(stat => {
    const { type, form, purity } = stat._id;
    const weight = stat.totalWeight;

    // 🔥 GOLD
    if (type === "gold") {
      let pricePerGram = goldPrices[24];

      if (purity === "21k") pricePerGram = goldPrices[21];
      if (purity === "18k") pricePerGram = goldPrices[18];

      const value = weight * pricePerGram;

      result.gold.totalValue += value;
      result.gold.totalSpent += stat.totalSpent;

      // grams
      if (form === "gram") {
        result.gold.grams.total += weight;
        result.gold.grams.value += value;
        result.gold.byPurity[purity] += weight;
      }

      // lira
      if (form === "lira") {
        result.gold.liras.quantity += stat.totalQuantity;
        result.gold.liras.value += value;
      }

      // ounce
      if (form === "ounce") {
        result.gold.ounces.quantity += stat.totalQuantity;
        result.gold.ounces.value += value;
      }
    }

    // 🪙 SILVER
    if (type === "silver") {
      const value = weight * silverPricePerGram;

      result.silver.totalValue += value;
      result.silver.totalSpent += stat.totalSpent;

      if (form === "gram") {
        result.silver.grams.total += weight;
        result.silver.grams.value += value;
      }

      if (form === "ounce") {
        result.silver.ounces.quantity += stat.totalQuantity;
        result.silver.ounces.value += value;
      }
    }
  });

  return result;
};