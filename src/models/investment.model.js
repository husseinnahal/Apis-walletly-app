import mongoose from "mongoose";

const InvestSchema=new mongoose.Schema({
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required:true
    },
    
    title:{
        type:String,
        required:true
    },
    
    description:{
        type:String,
        required:true
    },

    category: {
        type: String,
        enum: ['tech', 'food', 'ecommerce', 'service', 'other'],
        default: 'other'
    },

    isAvailable: {
        type: Boolean,
        default: true,
    },

    requiredAmount:{
        type:Number,
        required:true
    },


    // equity :Investor gives money → gets % of business
    // loan   :Investor gives money → you repay later
    // partnership :Investor becomes a co-founder
    investmentType: {  
        type: String,  
        enum: ['equity', 'loan', 'partnership'],  
        required: true  
    },

    // for equity type
    equityOffered: {
        type: Number, // %
        min: 0,
        max: 100
    },    
    
    // for loan type
    expectedReturn: {
        type: Number 
    },
    durationMonths: {
        type: Number
    },


    // idea → just an idea (no product yet)
    // mvp (Minimum Viable Product) → basic version exists
    // launched → real business already running
    stage: {  
    type: String,  
    enum: ['idea', 'mvp', 'launched'],  
    default: 'idea'  
    },

    // Nobody can invest less than $x
    minInvestment: {  
        type: Number,  
        default: 0  
    },

    views: {
        type: Number,
        default: 0
    },

},{timestamps:true})

const Investment=mongoose.model("Investment",InvestSchema);
export default Investment;