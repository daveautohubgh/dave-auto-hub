let token=localStorage.getItem("dah_token"),editing=null;const $=id=>document.getElementById(id);function show(){if(token){$("login").classList.add("hidden");$("dash").classList.remove("hidden");load()}else{$("login").classList.remove("hidden");$("dash").classList.add("hidden")}}$("loginForm").onsubmit=async e=>{e.preventDefault();let r=await fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:$("user").value,password:$("pass").value})});let x=await r.json();if(x.token){token=x.token;localStorage.setItem("dah_token",token);show()}else alert(x.error||"Login failed")};function headers(){return{"Content-Type":"application/json","Authorization":"Bearer "+token}}async function load(){let cars=await fetch("/api/cars").then(r=>r.json());$("list").innerHTML=cars.map(c=>`<div class="item"><strong>${c.name} (${c.year})</strong><small>${c.type} • ${c.status} • ${c.price_ghs?money(c.price_ghs):"Price on request"}</small><button onclick='edit(${JSON.stringify(c)})'>Edit</button><button onclick="del(${c.id})">Delete</button></div>`).join("");let rs=await fetch("/api/reservations",{headers:headers()}).then(r=>r.json());$("reservations").innerHTML=rs.length?rs.map(r=>`<div class="item"><strong>#${r.id} • ${r.car_name} (${r.year})</strong><small>${r.name} • ${r.phone} • ${r.status} • Payment: ${r.payment_status}</small></div>`).join(""):"No reservations yet."}
function money(n){return new Intl.NumberFormat("en-GH",{style:"currency",currency:"GHS",maximumFractionDigits:0}).format(n)}
function edit(c){editing=c;$("id").value=c.id;$("name").value=c.name;$("year").value=c.year;$("type").value=c.type;$("price").value=c.price_ghs;$("engine").value=c.engine||"";$("mileage").value=c.mileage||"";$("trans").value=c.transmission||"";$("fuel").value=c.fuel||"";$("status").value=c.status;$("photo").value=c.photo||"";$("desc").value=c.description||"";scrollTo(0,0)}
function clearForm(){editing=null;$("carForm").reset();$("id").value=""}
$("carForm").onsubmit=async e=>{e.preventDefault();let c={name:$("name").value,year:$("year").value,type:$("type").value,price_ghs:$("price").value,engine:$("engine").value,mileage:$("mileage").value,transmission:$("trans").value,fuel:$("fuel").value,status:$("status").value,photo:$("photo").value,description:$("desc").value};let url=editing?"/api/cars/"+editing.id:"/api/cars",method=editing?"PUT":"POST";
async function del(id){if(confirm("Delete this vehicle?")){await fetch("/api/cars/"+id,{method:"DELETE",headers:headers()});load()}}function logout(){localStorage.removeItem("dah_token");token=null;show()}show();const cloudinaryWidget = cloudinary.createUploadWidgetlet r = await fetch(url, {
  method,
  headers: headers(),
  body: JSON.stringify(c)
});

if (r.ok) {
  alert("Vehicle saved successfully!");
  clearForm();
  load();
} else {
  const error = await r.text();
  console.error("Save error:", error);
  alert("Could not save vehicle. Error: " + error);
}
  {
    cloudName: "k6reyjgb",
    uploadPreset: "dave_auto_hub_cars",
    sources: ["local", "camera"],
    multiple: false,
    clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
    maxFileSize: 10000000,
    folder: "dave-auto-hub/cars"
  },
  (error, result) => {
    if (!error && result && result.event === "success") {
      document.getElementById("photo").value = result.info.secure_url;

      const preview = document.getElementById("photoPreview");
      preview.src = result.info.secure_url;
      preview.style.display = "block";

      document.getElementById("uploadStatus").textContent =
        "Photo uploaded successfully. Now click Save vehicle.";
    }

    if (error) {
      document.getElementById("uploadStatus").textContent =
        "Photo upload failed. Please try again.";
      console.error(error);
    }
  }
);

document.getElementById("uploadPhoto").addEventListener("click", () => {
  cloudinaryWidget.open();
});
