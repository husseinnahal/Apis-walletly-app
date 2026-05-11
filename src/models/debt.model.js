import mongoose from "mongoose";

const DebtSchema=new mongoose.Schema({
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required:true
    },
    
    amount:{
        type:Number,
        required:true
    },
    person:{
        type:String,
        required:true
    },
    interestRate: { 
        type: Number,
        default: 0
    },
    type: {
        type: String,
        enum: ["debt", "credit"], 
        required: true,
    },
    note:{
        type:String,
    },
    dueDate: {
        type: Date,
    },
    status: { 
        type: String,
        enum: ["active", "paid"],
        default: "active"
    },
    total:{
        type:Number,
        default:0
    },
    paidDebt:[
        {
            amount: {
              type: Number,
              required: true,
            },
            date: {
              type: Date,
              default: Date.now,
            },
            transactionId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Transaction',
            },
        },
    ],


    dueDateNotified: {
        type: Boolean,
        default: false
    }
},{timestamps:true})

const Debt=mongoose.model("Debt",DebtSchema);
export default Debt;