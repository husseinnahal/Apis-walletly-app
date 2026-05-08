import mongoose from "mongoose";

const MetalSchema=new mongoose.Schema({
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required:true
    },
        
    type: {
        type: String,
        enum: ["gold", "silver"], 
        required: true,
    },

    form: {
      type: String,
      enum: ["gram", "ounce", "lira"],
      default: "gram",
    },
    // for grams
    purity: {
      type: String,
      enum: ["18k", "21k", "24k"],
    },

    // only for lira
    liraType: {
      type: String,
      enum: ["quarter", "half", "full"], // 1/4, 1/2, 1
    },

    quantity: {
      type: Number,
      required: true,
      default:1,
    },

    weight: {
      type: Number,
    },

    price:{
        type:Number,
        required:true
    },

    note:{
        type:String,
    },

    date: {
        type: Date,
        required:true
    },

    transactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction'
    }

},{timestamps:true})

const Metal=mongoose.model("Metal",MetalSchema);
export default Metal;