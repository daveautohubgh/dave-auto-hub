import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const db = new Database(path.join(__dirname, "dave_auto_hub.db"));

app.use(helmet({contentSecurityPolicy:false}));
app.use(express.json({limit:"1mb"}));
app.use(express.urlencoded({extended:true}));
app.use(morgan("combined"));
app.use(express.static(path.join(__dirname,"public")));

db.exec(`
CREATE TABLE IF NOT EXISTS cars (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL, year INTEGER NOT NULL, type TEXT NOT NULL,
 price_ghs INTEGER NOT NULL DEFAULT 0, engine TEXT, mileage TEXT,
 transmission TEXT, fuel TEXT, status TEXT NOT NULL DEFAULT 'Available',
 photo TEXT, description TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS reservations (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 car_id INTEGER NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL,
 email TEXT, message TEXT, deposit_ghs INTEGER DEFAULT 0,
 payment_reference TEXT, payment_status TEXT DEFAULT 'unpaid',
 status TEXT DEFAULT 'pending', created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

const seed = db.prepare("SELECT COUNT(*) n FROM cars").get().n;
if (!seed) {
  const add=db.prepare(`INSERT INTO cars(name,year,type,price_ghs,engine,transmission,fuel,status,description)
    VALUES(?,?,?,?,?,?,?,?,?)`);
  add.run("Hyundai Avante AD",2016,"Korean",0,"1,591 cc","Automatic","Petrol","Available","Add the confirmed price and photos from the admin dashboard.");
  add.run("Toyota Corolla",2020,"Used",0,"1,798 cc","Automatic","Petrol","Available","Add the confirmed price and photos from the admin dashboard.");
  add.run("Kia Sportage",2021,"Imported",0,"2,000 cc","Automatic","Petrol","Available","Add the confirmed price and photos from the admin dashboard.");
}

const sessions = new Map();
function auth(req,res,next){
  const token=(req.headers.authorization||"").replace("Bearer ","");
  if(!token || !sessions.has(token)) return res.status(401).json({error:"Unauthorized"});
  next();
}
function adminLogin(req,res){
  const {username,password}=req.body;
  if(username!==process.env.ADMIN_USERNAME || password!==process.env.ADMIN_PASSWORD)
    return res.status(401).json({error:"Invalid credentials"});
  const token=crypto.randomBytes(32).toString("hex");
  sessions.set(token,Date.now());
  res.json({token});
}

app.post("/api/admin/login",adminLogin);

app.get("/api/cars",(req,res)=>{
  const cars=db.prepare("SELECT * FROM cars ORDER BY created_at DESC").all();
  res.json(cars);
});

app.post("/api/cars",auth,(req,res)=>{
  const c=req.body;
  const result=db.prepare(`INSERT INTO cars(name,year,type,price_ghs,engine,mileage,transmission,fuel,status,photo,description)
    VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(c.name,Number(c.year),c.type,Number(c.price_ghs||0),c.engine||"",c.mileage||"",c.transmission||"",c.fuel||"",c.status||"Available",c.photo||"",c.description||"");
  res.json({id:result.lastInsertRowid});
});

app.put("/api/cars/:id",auth,(req,res)=>{
  const c=req.body;
  db.prepare(`UPDATE cars SET name=?,year=?,type=?,price_ghs=?,engine=?,mileage=?,transmission=?,fuel=?,status=?,photo=?,description=? WHERE id=?`)
    .run(c.name,Number(c.year),c.type,Number(c.price_ghs||0),c.engine||"",c.mileage||"",c.transmission||"",c.fuel||"",c.status||"Available",c.photo||"",c.description||"",req.params.id);
  res.json({ok:true});
});

app.delete("/api/cars/:id",auth,(req,res)=>{
  db.prepare("DELETE FROM cars WHERE id=?").run(req.params.id);
  res.json({ok:true});
});

app.get("/api/reservations",auth,(req,res)=>{
  res.json(db.prepare(`SELECT r.*,c.name car_name,c.year FROM reservations r JOIN cars c ON c.id=r.car_id ORDER BY r.created_at DESC`).all());
});

app.post("/api/reservations",async(req,res)=>{
  const {car_id,name,phone,email,message,deposit_ghs}=req.body;
  const car=db.prepare("SELECT * FROM cars WHERE id=?").get(car_id);
  if(!car) return res.status(404).json({error:"Vehicle not found"});
  const result=db.prepare(`INSERT INTO reservations(car_id,name,phone,email,message,deposit_ghs)
    VALUES(?,?,?,?,?,?)`).run(car_id,name,phone,email||"",message||"",Number(deposit_ghs||process.env.RESERVATION_DEPOSIT_GHS||0));
  res.json({reservation_id:result.lastInsertRowid,whatsapp:`https://wa.me/${process.env.WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hello Dave Auto Hub, I want to reserve ${car.name} (${car.year}). Reservation #${result.lastInsertRowid}. Name: ${name}. Phone: ${phone}.`)}`});
});

/*
 Paystack production integration:
 1. Never put PAYSTACK_SECRET_KEY in browser code.
 2. Create a server-side initialize endpoint using POST https://api.paystack.co/transaction/initialize.
 3. Amount is in pesewas, currency GHS.
 4. Save the returned reference against the reservation.
 5. Verify payment server-side and use the charge.success webhook before marking a deposit paid.
*/
app.post("/api/payments/initialize",auth,async(req,res)=>{
  if(!process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY.includes("REPLACE_ME"))
    return res.status(503).json({error:"Paystack secret key is not configured."});
  const {email,amount_ghs,callback_url,metadata}=req.body;
  const response=await fetch("https://api.paystack.co/transaction/initialize",{
    method:"POST",
    headers:{"Authorization":`Bearer ${process.env.PAYSTACK_SECRET_KEY}`,"Content-Type":"application/json"},
    body:JSON.stringify({email,amount:Math.round(Number(amount_ghs)*100),currency:"GHS",callback_url,metadata})
  });
  const data=await response.json();
  if(!response.ok) return res.status(response.status).json(data);
  res.json(data);
});

app.post("/api/paystack/webhook",express.raw({type:"application/json"}),(req,res)=>{
  const signature=req.headers["x-paystack-signature"];
  const hash=crypto.createHmac("sha512",process.env.PAYSTACK_SECRET_KEY||"").update(req.body).digest("hex");
  if(!signature || !crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(hash))) return res.sendStatus(401);
  const event=JSON.parse(req.body.toString());
  if(event.event==="charge.success"){
    const ref=event.data.reference;
    db.prepare("UPDATE reservations SET payment_status='paid',payment_reference=? WHERE payment_reference=? OR id=(SELECT id FROM reservations WHERE payment_reference=? LIMIT 1)")
      .run(ref,ref,ref);
  }
  res.sendStatus(200);
});

app.get("/{*splat}",(req,res)=>{
  res.sendFile(path.join(__dirname,"public","index.html"));
});
app.listen(process.env.PORT||3000,()=>console.log(`Dave Auto Hub running on port ${process.env.PORT||3000}`));
