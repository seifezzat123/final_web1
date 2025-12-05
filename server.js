const {app}= require('./index');
const db_access = require('./db.js');
const db = db_access.db;

const PORT=3000;

console.log('App object:', typeof app); // Debug: check if app exists

db.serialize(() => {
    db.run(db_access.createUserTable, (err) => {
        if (err) console.log('Error creating user table;', err.message);
    })
});


app.listen(PORT,()=>{
    console.log(`server is running on port ${PORT}`);
});
