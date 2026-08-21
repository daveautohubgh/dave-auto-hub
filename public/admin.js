let token = localStorage.getItem("dah_token");
let editing = null;

const $ = id => document.getElementById(id);

function show() {
  if (token) {
    $("login").classList.add("hidden");
    $("dash").classList.remove("hidden");
    load();
  } else {
    $("login").classList.remove("hidden");
    $("dash").classList.add("hidden");
  }
}

$("loginForm").onsubmit = async e => {
  e.preventDefault();

  try {
    const r = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: $("user").value,
        password: $("pass").value
      })
    });

    const x = await r.json();

    if (x.token) {
      token = x.token;
      localStorage.setItem("dah_token", token);
      show();
    } else {
      alert(x.error || "Login failed");
    }
  } catch (error) {
    console.error(error);
    alert("Login failed. Please try again.");
  }
};

function headers() {
  return {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + token
  };
}

async function load() {
  try {
    const cars = await fetch("/api/cars").then(r => r.json());

    $("list").innerHTML = cars.map(c => `
      <div class="item">
        <strong>${c.name} (${c.year})</strong>
        <small>
          ${c.type} • ${c.status} •
          ${c.price_ghs ? money(c.price_ghs) : "Price on request"}
        </small>
        <button onclick='editCar(${JSON.stringify(c)})'>Edit</button>
        <button onclick="deleteCar(${c.id})">Delete</button>
      </div>
    `).join("");

    const rs = await fetch("/api/reservations", {
      headers: headers()
    }).then(r => r.json());

    $("reservations").innerHTML = rs.length
      ? rs.map(r => `
        <div class="item">
          <strong>#${r.id} • ${r.car_name} (${r.year})</strong>
          <small>
            ${r.name} • ${r.phone} • ${r.status} •
            Payment: ${r.payment_status}
          </small>
        </div>
      `).join("")
      : "No reservations yet.";

  } catch (error) {
    console.error("Loading error:", error);
  }
}

function money(n) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 0
  }).format(n);
}

function editCar(c) {
  editing = c;

  $("id").value = c.id || "";
  $("name").value = c.name || "";
  $("year").value = c.year || "";
  $("type").value = c.type || "Used";
  $("price").value = c.price_ghs || "";
  $("engine").value = c.engine || "";
  $("mileage").value = c.mileage || "";
  $("trans").value = c.transmission || "";
  $("fuel").value = c.fuel || "";
  $("status").value = c.status || "Available";
  $("photo").value = c.photo || "";
  $("desc").value = c.description || "";

  if (c.photo) {
    $("photoPreview").src = c.photo;
    $("photoPreview").style.display = "block";
  }

  scrollTo(0, 0);
}

function clearForm() {
  editing = null;
  $("carForm").reset();
  $("id").value = "";
  $("photo").value = "";
  $("photoPreview").src = "";
  $("photoPreview").style.display = "none";
  $("uploadStatus").textContent = "";
}

async function deleteCar(id) {
  if (!confirm("Delete this vehicle?")) return;

  try {
    await fetch("/api/cars/" + id, {
      method: "DELETE",
      headers: headers()
    });

    load();
  } catch (error) {
    console.error(error);
    alert("Could not delete vehicle.");
  }
}

function logout() {
  localStorage.removeItem("dah_token");
  token = null;
  show();
}

$("carForm").onsubmit = async e => {
  e.preventDefault();

  const c = {
    name: $("name").value,
    year: $("year").value,
    type: $("type").value,
    price_ghs: $("price").value,
    engine: $("engine").value,
    mileage: $("mileage").value,
    transmission: $("trans").value,
    fuel: $("fuel").value,
    status: $("status").value,
    photo: $("photo").value,
    description: $("desc").value
  };

  const url = editing
    ? "/api/cars/" + editing.id
    : "/api/cars";

  const method = editing ? "PUT" : "POST";

  try {
    const r = await fetch(url, {
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
      alert("Could not save vehicle: " + error);
    }
  } catch (error) {
    console.error(error);
    alert("A connection error occurred while saving.");
  }
};

const cloudinaryWidget = cloudinary.createUploadWidget(
  {
    cloudName: "k6reyjgb",
    uploadPreset: "dave_auto_hub_cars",
    sources: ["local", "camera"],
    multiple: false,
    clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
    maxFileSize: 10000000
  },
  (error, result) => {
    if (error) {
      console.error("Cloudinary error:", error);
      $("uploadStatus").textContent =
        "Photo upload failed. Please try again.";
      return;
    }

    if (result && result.event === "success") {
      $("photo").value = result.info.secure_url;

      $("photoPreview").src = result.info.secure_url;
      $("photoPreview").style.display = "block";

      $("uploadStatus").textContent =
        "Photo uploaded successfully. Now click Save vehicle.";
    }
  }
);

$("uploadPhoto").addEventListener("click", () => {
  cloudinaryWidget.open();
});

show();
