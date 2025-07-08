import express from "express"
import cors from "cors"
const port = 3001; 

const app = express(); 

app.use(express.json());
app.use(cors()); 

app.get("/users", async (req, res)=>{
    res.json({
        name: "Rahul", 
        email: "Rahul@gmail.com"
    })
})

app.listen(port, ()=>{
    console.log(`Http-backend is listening to: http://localhost:${port}`)
})