import mongoose from "mongoose";

const transactionsSchema=new mongoose.Schema({
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required:true
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },
    title:{
        type:String,
        required:true
    },
    amount:{
        type:Number,
        required:true
    },
    type:{
        type:String,
        enum:["expense","income", "saving", "transfer"],
        required:true
    },
    date:{
        type:Date,
        required:true,
        default:Date.now
    },
    note:{
        type:String
    }



},{timestamps: true})


const Transactions=mongoose.model("Transaction",transactionsSchema);
export default Transactions;