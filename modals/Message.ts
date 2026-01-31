import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    content: String,
    // Correct spelling for attachment and keep legacy field for compatibility
    attachment: String,
    attachement: String,
}, {
    timestamps: true,

});

// Ensure legacy documents using `attachement` are treated as `attachment` on save
messageSchema.pre('save', function (this: any) {
    if (this.attachement && !this.attachment) {
        this.attachment = this.attachement;
    }
    // no `next()` call: use synchronous hook without callback to be compatible with current Mongoose middleware
});

const Message = mongoose.model("Message", messageSchema);

export default Message;