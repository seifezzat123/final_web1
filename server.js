const {app}= require('./index');
const db_access = require('./db.js');
const db = db_access.db;

const PORT=3000;

console.log('App object:', typeof app);

db.serialize(() => {
    db.run(db_access.createUserTable, (err) => {
        if (err) console.log('Error creating user table;', err.message);
    })
    db.run(db_access.createAddressTable, (err) => {
        if (err) console.log('Error creating address table;', err.message);
    })
    db.run(db_access.createMedicineTable, (err) => {
        if (err) console.log('Error creating medicine table;', err.message);
    })
    db.run(db_access.createCartTable, (err) => {
        if (err) console.log('Error creating cart table;', err.message);
    })
    db.run(db_access.createOrderTable, (err) => {
        if (err) console.log('Error creating order table;', err.message);
    })
    db.run(db_access.createFeedbackTable, (err) => {
        if (err) console.log('Error creating feedback table;', err.message);
    })
    db.run(db_access.createMedicineFeedbackTable, (err) => {
        if (err) console.log('Error creating medicine feedback table;', err.message);
    })
});


app.listen(PORT,()=>{
    console.log(`server is running on port ${PORT}`);
});
