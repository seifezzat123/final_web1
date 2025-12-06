const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const app = express();
const authRouter = require('./routes/authRouter.js');
const userRouter = require('./routes/User_Router.js')
const medicineRouter = require('./routes/medicineRouter.js');
const cartRouter = require('./routes/cartRouter.js');
const orderRouter = require('./routes/orderRouter.js');
const path = require('path');


dotenv.config();
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
}));

const cookieParser = require('cookie-parser')
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use('/auth', authRouter); 
app.use('/user', userRouter);
app.use('/medicine', medicineRouter);
app.use('/cart', cartRouter);
app.use('/order', orderRouter);


module.exports= {
    app,

}

